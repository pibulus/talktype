import { AudioStateManager, AudioStates } from './audioStates';
import {
	audioState,
	audioActions,
	uiActions,
	recordingState,
	transcriptionActions
} from '../infrastructure/stores';
import { get } from 'svelte/store';
import { saveRecordingDraft } from './recordingRecoveryStore';
import { browser } from '$app/environment';
import { liveMode } from '$lib';
import { STORAGE_KEYS } from '$lib/constants';
import { transcriptionStore } from '$lib/stores/transcriptionStore';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('AudioService');
const IOS_PWA_WARM_STREAM_MS = 20 * 1000;

export const AudioEvents = {
	RECORDING_STARTED: 'audio:recordingStarted',
	RECORDING_STOPPED: 'audio:recordingStopped',
	RECORDING_ERROR: 'audio:recordingError',
	STATE_CHANGED: 'audio:stateChanged',
	WAVEFORM_DATA: 'audio:waveformData'
};

export class AudioService {
	constructor() {
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.audioContext = null;
		this.isIOS =
			browser &&
			(/iPhone|iPad|iPod/.test(navigator.userAgent) ||
				(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
		this.stream = null;
		this.source = null;
		this.analyser = null;
		this.cleanupPromise = null;
		this.animationFrameId = null;
		this.releaseStreamTimeout = null;

		this.stateManager = new AudioStateManager();

		this.stateManager.addListener(({ oldState, newState, error }) => {
			log.log(`Audio state changed: ${oldState} -> ${newState}`);

			// Update the store instead of emitting event
			audioActions.updateState(newState, error);
		});
	}

	async initializeAudioContext() {
		if ((!this.audioContext || this.audioContext.state === 'closed') && browser) {
			const AudioContext = window.AudioContext || window.webkitAudioContext;
			this.audioContext = new AudioContext();
		}

		// iOS Safari requires user gesture to resume audio context
		if (this.audioContext?.state === 'suspended') {
			try {
				await this.audioContext.resume();
				log.log('Audio context resumed successfully');
			} catch (error) {
				log.warn('Failed to resume audio context:', error.message);
				// Don't throw here - let the app continue and try again on user interaction
			}
		}

		// For iOS, we need to be more patient - context might take time to become running
		if (this.isIOS && this.audioContext?.state === 'suspended') {
			// Give it a moment and try one more time
			await new Promise((resolve) => setTimeout(resolve, 100));
			try {
				await this.audioContext.resume();
			} catch (error) {
				log.warn('Second attempt to resume audio context failed:', error.message);
			}
		}

		return this.audioContext?.state === 'running';
	}

	async checkMediaDevices() {
		if (!browser) return false;
		if (!navigator?.mediaDevices?.getUserMedia) return false;
		return true;
	}

	async requestPermissions() {
		try {
			if (!(await this.checkMediaDevices())) {
				throw new Error('MediaDevices API not available');
			}

			this.cancelWarmStreamRelease();

			if (this.shouldKeepStreamWarm() && this.hasLiveStream()) {
				log.log('Reusing warm iOS PWA microphone stream');
				return { granted: true, stream: this.stream };
			}

			if (this.isIOS) {
				const contextReady = await this.initializeAudioContext();
				if (!contextReady) {
					log.warn('Audio context not ready, but continuing with permission request');
					// Don't throw - iOS sometimes needs the permission request to activate context
				}

				const constraints = {
					audio: {
						echoCancellation: true,
						autoGainControl: true,
						noiseSuppression: true
					}
				};

				try {
					const stream = await navigator.mediaDevices.getUserMedia(constraints);
					if (stream && stream.active) {
						return { granted: true, stream };
					} else {
						stream?.getTracks().forEach((track) => track.stop());
						return { granted: false, error: new Error('No active audio stream after permission') };
					}
				} catch (iosSpecificError) {
					log.warn('iOS specific constraints failed, trying fallback:', iosSpecificError.message);
					const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
					if (stream && stream.active) {
						return { granted: true, stream };
					} else {
						stream?.getTracks().forEach((track) => track.stop());
						return {
							granted: false,
							error: new Error('No active audio stream after fallback permission')
						};
					}
				}
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: false,
						noiseSuppression: false,
						autoGainControl: false
					}
				});
				if (stream && stream.active) {
					return { granted: true, stream };
				} else {
					stream?.getTracks().forEach((track) => track.stop());
					return {
						granted: false,
						error: new Error('No active audio stream after permission')
					};
				}
			} catch (detailedConstraintError) {
				log.log(
					'Detailed constraints failed, falling back to simple audio:',
					detailedConstraintError.message
				);
				try {
					const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
					if (stream && stream.active) {
						return { granted: true, stream };
					} else {
						stream?.getTracks().forEach((track) => track.stop());
						return {
							granted: false,
							error: new Error('No active audio stream after permission')
						};
					}
				} catch (fallbackError) {
					return { granted: false, error: fallbackError };
				}
			}
		} catch (error) {
			log.error('Error requesting audio permissions:', error);
			return { granted: false, error };
		}
	}

	async startRecording() {
		try {
			if (this.stateManager.getState() !== AudioStates.IDLE) {
				await this.cleanup();
			}

			this.cancelWarmStreamRelease();
			this.stateManager.setState(AudioStates.INITIALIZING);
			this.stateManager.setState(AudioStates.REQUESTING_PERMISSIONS);

			const { granted, stream, error } = await this.requestPermissions();

			if (!granted) {
				this.stateManager.setState(AudioStates.PERMISSION_DENIED);
				uiActions.setPermissionError(true);
				throw (
					error ||
					new Error('Need your permission to hear you - click the microphone icon in your browser!')
				);
			}

			if (!stream) {
				throw new Error('Microphone not found - is it plugged in?');
			}

			this.stateManager.setState(AudioStates.READY);
			this.audioChunks = [];

			if (typeof MediaRecorder === 'undefined') {
				throw new Error('Your browser needs an update to use recording features');
			}

			try {
				const mimeTypes = this.isIOS
					? ['audio/mp4', 'audio/aac', 'audio/webm', '']
					: ['audio/webm', 'audio/ogg', ''];

				let mediaRecorderOptions = null;

				for (const mimeType of mimeTypes) {
					if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
						// Optimize bitrate for speech (48kbps = 50% smaller files vs default 128kbps)
						// Speech transcription doesn't need high quality audio
						mediaRecorderOptions = mimeType
							? { mimeType, audioBitsPerSecond: 48000 }
							: { audioBitsPerSecond: 48000 };
						break;
					}
				}

				this.stream = stream;
				this.mediaRecorder = new MediaRecorder(this.stream, mediaRecorderOptions);

				await this.initializeAudioContext();
				this.disconnectAudioGraph();

				this.source = this.audioContext.createMediaStreamSource(this.stream);
				this.analyser = this.audioContext.createAnalyser();
				this.analyser.fftSize = 256;
				this.source.connect(this.analyser);

				this.startWaveformMonitoring();
			} catch (mrError) {
				stream.getTracks().forEach((track) => track.stop());
				throw mrError;
			}

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);

					// Stream to Deepgram if Live Mode is enabled AND Privacy Mode is disabled
					const privacyMode =
						typeof localStorage !== 'undefined' &&
						localStorage.getItem(STORAGE_KEYS.PRIVACY_MODE) === 'true';
					const liveModeEnabled = get(liveMode) === 'true';
					if (liveModeEnabled && !privacyMode) {
						transcriptionStore.send(event.data);
					}
				}
			};

			// Use smaller timeslice (250ms) to capture audio more frequently
			// This helps prevent losing the last bit of audio
			this.mediaRecorder.start(250);
			this.stateManager.setState(AudioStates.RECORDING);

			// Update the store with mimeType
			audioState.update((current) => ({
				...current,
				mimeType: this.mediaRecorder.mimeType || 'audio/webm'
			}));

			// Connect to Deepgram if Live Mode is enabled AND Privacy Mode is disabled
			const privacyMode =
				typeof localStorage !== 'undefined' &&
				localStorage.getItem(STORAGE_KEYS.PRIVACY_MODE) === 'true';
			const liveModeEnabled = get(liveMode) === 'true';
			if (liveModeEnabled && !privacyMode) {
				transcriptionStore.connect().catch((err) => {
					log.error('Failed to connect to Deepgram:', err);
					// Don't fail recording, just fallback to batch
				});
			}

			return true;
		} catch (error) {
			log.error('Error starting recording:', error);
			this.stateManager.setState(AudioStates.ERROR, { error });

			const friendlyMessage = error.message.includes('permission')
				? 'Need microphone access - check your browser settings!'
				: 'Recording hiccup - give it another try?';
			uiActions.setErrorMessage(friendlyMessage);

			await this.cleanup();
			throw error;
		}
	}

	startWaveformMonitoring() {
		if (!this.analyser) return;

		// Cancel any existing animation frame to prevent multiple loops
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

		const updateWaveform = () => {
			// Double check that we're still recording and have valid analyser
			if (this.stateManager.getState() !== AudioStates.RECORDING || !this.analyser) {
				if (this.animationFrameId) {
					cancelAnimationFrame(this.animationFrameId);
					this.animationFrameId = null;
				}
				return;
			}

			try {
				this.analyser.getByteFrequencyData(dataArray);
				// Update store instead of emitting event
				audioActions.setWaveformData(Array.from(dataArray));
				this.animationFrameId = requestAnimationFrame(updateWaveform);
			} catch (error) {
				log.warn('Waveform monitoring error:', error.message);
				this.animationFrameId = null;
			}
		};

		this.animationFrameId = requestAnimationFrame(updateWaveform);
	}

	async stopRecording() {
		return new Promise((resolve) => {
			// Update state through state manager first - this will trigger store update
			this.stateManager.setState(AudioStates.STOPPING);

			// Check recorder state - attempt to stop even if internal state doesn't match
			if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
				this.stateManager.setState(AudioStates.IDLE);
				resolve(null); // No active recording to stop
				return;
			}

			// The mimeType should be determined before onstop is set up.
			const mimeType = this.mediaRecorder.mimeType || 'audio/webm';

			// Request any remaining data before stopping
			// This ensures we capture audio right up to when stop was pressed
			if (this.mediaRecorder.state === 'recording') {
				this.mediaRecorder.requestData();
			}

			// Assign onstop BEFORE calling stop() to avoid race condition
			// where stop fires synchronously and the handler isn't attached yet
			this.mediaRecorder.onstop = async () => {
				// Create the Blob from this.audioChunks, which now contains all chunks
				// including the final one from the last dataavailable event.
				const audioBlob = new Blob(this.audioChunks, { type: mimeType });
				log.log('Created audio blob:', audioBlob.size, 'bytes, type:', mimeType);

				// Update store with audio blob
				audioActions.setAudioBlob(audioBlob, mimeType);

				this.disconnectAudioGraph();

				if (this.shouldKeepStreamWarm()) {
					this.scheduleWarmStreamRelease();
				} else {
					this.stopStreamTracks();
				}

				this.audioChunks = [];
				this.mediaRecorder = null;

				// Persist before transcription starts so success cleanup cannot race a late draft write.
				await this.#persistRecordingDraft(audioBlob, mimeType);

				// Ensure state is properly reset
				this.stateManager.setState(AudioStates.IDLE);

				resolve(audioBlob);
			};

			// Small delay to ensure final audio chunk from requestData() is captured
			setTimeout(() => {
				try {
					this.mediaRecorder.stop();
				} catch (error) {
					log.warn('Error stopping MediaRecorder:', error.message);

					// Ensure tracks are stopped even if MediaRecorder stop fails
					this.disconnectAudioGraph();
					if (this.shouldKeepStreamWarm()) {
						this.scheduleWarmStreamRelease();
					} else {
						this.stopStreamTracks();
					}

					// Force state reset on error
					this.stateManager.setState(AudioStates.IDLE);
					resolve(null);
				}
			}, 100); // Small delay to ensure final chunk is captured
		});
	}

	async #persistRecordingDraft(audioBlob, mimeType) {
		if (!browser || !audioBlob) return;

		try {
			const durationFromStore = get(recordingState)?.duration;
			const duration =
				typeof durationFromStore === 'number' ? durationFromStore : audioBlob.size / 2000;

			const draft = await saveRecordingDraft(audioBlob, {
				mimeType,
				size: audioBlob.size,
				duration,
				sampleRate: 16000
			});

			if (draft) {
				transcriptionActions.setPendingRecording({
					id: draft.id,
					createdAt: draft.createdAt,
					duration,
					size: audioBlob.size,
					mimeType
				});
			}
		} catch (error) {
			log.warn('Failed to persist recording draft:', error.message);
		}
	}

	async cleanup() {
		this.cancelWarmStreamRelease();
		transcriptionStore.disconnect();

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.cleanupPromise) {
			return this.cleanupPromise;
		}

		const currentState = this.stateManager.getState();
		const allowedCleanupStates = [
			AudioStates.INITIALIZING,
			AudioStates.REQUESTING_PERMISSIONS,
			AudioStates.READY,
			AudioStates.RECORDING,
			AudioStates.STOPPING,
			AudioStates.CLEANING,
			AudioStates.ERROR,
			AudioStates.PAUSED
		];

		if (!allowedCleanupStates.includes(currentState) && currentState !== AudioStates.IDLE) {
			return Promise.resolve();
		}

		if (
			currentState === AudioStates.IDLE &&
			!this.mediaRecorder &&
			!this.stream &&
			!this.audioContext
		) {
			return Promise.resolve();
		}

		this.stateManager.setState(AudioStates.CLEANING);
		this.cleanupPromise = this.#doCleanup().finally(() => {
			this.cleanupPromise = null;
		});

		return this.cleanupPromise;
	}

	async #doCleanup() {
		try {
			if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
				await new Promise((resolve) => {
					const timeout = setTimeout(() => {
						resolve();
					}, 1000);

					this.mediaRecorder.onstop = () => {
						clearTimeout(timeout);
						resolve();
					};

					try {
						this.mediaRecorder.stop();
					} catch (stopError) {
						log.warn('Error stopping MediaRecorder:', stopError.message);
						resolve();
					}
				});
			}

			if (this.stream) {
				const tracks = this.stream.getTracks();
				await Promise.all(
					tracks.map((track) => {
						return new Promise((resolve) => {
							// Assign onended BEFORE stop() to avoid race if it fires synchronously
							track.onended = resolve;
							setTimeout(resolve, 500);
							track.stop();
						});
					})
				);
				this.stream = null;
			}

			if (this.audioContext) {
				this.disconnectAudioGraph();

				if (this.isIOS) {
					try {
						await this.audioContext.suspend();
						await new Promise((resolve) => setTimeout(resolve, 100));
					} catch (suspendError) {
						log.warn('Error suspending iOS audio context:', suspendError.message);
					}
				}

				try {
					await this.audioContext.close();
				} catch (closeError) {
					log.warn('Error closing audio context:', closeError.message);
				}
				this.audioContext = null;
			}

			this.mediaRecorder = null;
			this.audioChunks = [];

			if (this.isIOS) {
				await new Promise((resolve) => setTimeout(resolve, 300));
			}
		} finally {
			this.stateManager.setState(AudioStates.IDLE);
		}
	}

	hasLiveStream() {
		return (
			this.stream?.active &&
			this.stream.getAudioTracks().some((track) => track.readyState === 'live')
		);
	}

	shouldKeepStreamWarm() {
		if (!browser || !this.isIOS) return false;

		return (
			navigator.standalone === true ||
			window.matchMedia?.('(display-mode: standalone)').matches === true
		);
	}

	cancelWarmStreamRelease() {
		if (this.releaseStreamTimeout) {
			clearTimeout(this.releaseStreamTimeout);
			this.releaseStreamTimeout = null;
		}
	}

	scheduleWarmStreamRelease() {
		this.cancelWarmStreamRelease();

		this.releaseStreamTimeout = setTimeout(() => {
			this.stopStreamTracks();
			this.releaseStreamTimeout = null;
		}, IOS_PWA_WARM_STREAM_MS);
	}

	stopStreamTracks() {
		if (!this.stream) return;

		this.stream.getTracks().forEach((track) => {
			track.stop();
		});
		this.stream = null;
	}

	disconnectAudioGraph() {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.source) {
			try {
				this.source.disconnect();
			} catch (sourceError) {
				log.warn('Error disconnecting audio source:', sourceError.message);
			}
			this.source = null;
		}

		if (this.analyser) {
			try {
				this.analyser.disconnect();
			} catch (analyserError) {
				log.warn('Error disconnecting analyser:', analyserError.message);
			}
			this.analyser = null;
		}
	}

	getRecordingState() {
		return this.stateManager.getState();
	}

	isRecording() {
		return this.stateManager.getState() === AudioStates.RECORDING;
	}
}

export const audioService = new AudioService();
