import { AudioStateManager, AudioStates } from './audioStates';
import {
	audioState,
	audioActions,
	uiActions,
	recordingState,
	transcriptionActions
} from '../infrastructure/stores';
import { get } from 'svelte/store';
import {
	appendRecordingDraftJournalChunk,
	beginRecordingDraftJournal,
	saveRecordingDraft,
	updateRecordingDraftJournalMetadata
} from './recordingRecoveryStore';
import { browser } from '$app/environment';
import { getTranscriptionMode } from '$lib/services/transcription/mode.js';
import { transcriptionStore } from '$lib/stores/transcriptionStore';
import { createLogger } from '$lib/utils/logger';
import { isPermissionError } from './permissionErrors.js';

const log = createLogger('AudioService');
const SPEECH_AUDIO_BITS_PER_SECOND = 48000;
const MEDIA_RECORDER_TIMESLICE_MS = 250;
const FINAL_AUDIO_CHUNK_DELAY_MS = 100;
const RECOVERY_CHECKPOINT_SETTLE_MS = 120;
const RECOVERY_JOURNAL_FLUSH_MS = 5000;
const RECOVERY_JOURNAL_MAX_BUFFERED_CHUNKS = 20;
const CLEANUP_RECORDER_STOP_TIMEOUT_MS = 1000;
const TRACK_STOP_TIMEOUT_MS = 500;
const IOS_AUDIO_CONTEXT_RETRY_DELAY_MS = 100;
const IOS_CLEANUP_SETTLE_MS = 300;
const IOS_PWA_WARM_STREAM_MS = 20 * 1000;

function stopMediaStreamTracks(stream) {
	stream?.getTracks().forEach((track) => track.stop());
}

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
		this.stopPromise = null;
		this.recoveryCheckpointInFlight = false;
		this.recoveryJournalBuffer = [];
		this.recoveryJournalSequence = 0;
		this.recoveryJournalTotalSize = 0;
		this.recoveryJournalWriteQueue = Promise.resolve();
		this.recoveryJournalFlushTimeout = null;
		this.activeRecordingSessionId = null;
		this.activeRecordingMode = null;
		this.animationFrameId = null;
		this.releaseStreamTimeout = null;
		this.visibilityChangeHandler = null;
		this.wakeLockSentinel = null;

		this.stateManager = new AudioStateManager();

		this.stateManager.addListener(({ oldState, newState, error }) => {
			log.log(`Audio state changed: ${oldState} -> ${newState}`);

			// Update the store instead of emitting event
			audioActions.updateState(newState, error);
		});

		if (browser) {
			this.visibilityChangeHandler = () => {
				if (document.visibilityState === 'visible') {
					this.initializeAudioContext().catch((err) =>
						log.warn('Failed to resume audio context on visibility change:', err)
					);
					if (this.stateManager.getState() === AudioStates.RECORDING) {
						void this.requestScreenWakeLock();
					}
				} else if (this.stateManager.getState() === AudioStates.RECORDING) {
					void this.#checkpointRecordingDraft(
						this.mediaRecorder?.mimeType || 'audio/webm',
						this.activeRecordingSessionId,
						'visibility-hidden'
					);
				}
			};
			document.addEventListener('visibilitychange', this.visibilityChangeHandler);
		}
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
			await new Promise((resolve) => setTimeout(resolve, IOS_AUDIO_CONTEXT_RETRY_DELAY_MS));
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
					return this.#permissionResultFromStream(
						stream,
						'No active audio stream after permission'
					);
				} catch (iosSpecificError) {
					log.warn('iOS specific constraints failed, trying fallback:', iosSpecificError.message);
					const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
					return this.#permissionResultFromStream(
						stream,
						'No active audio stream after fallback permission'
					);
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
				return this.#permissionResultFromStream(stream, 'No active audio stream after permission');
			} catch (detailedConstraintError) {
				log.log(
					'Detailed constraints failed, falling back to simple audio:',
					detailedConstraintError.message
				);
				try {
					const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
					return this.#permissionResultFromStream(
						stream,
						'No active audio stream after permission'
					);
				} catch (fallbackError) {
					return { granted: false, error: fallbackError };
				}
			}
		} catch (error) {
			log.error('Error requesting audio permissions:', error);
			return { granted: false, error };
		}
	}

	#permissionResultFromStream(stream, errorMessage) {
		if (stream?.active) {
			return { granted: true, stream };
		}

		stopMediaStreamTracks(stream);
		return { granted: false, error: new Error(errorMessage) };
	}

	#getMediaRecorderOptions() {
		const mimeTypes = this.isIOS
			? ['audio/mp4', 'audio/aac', 'audio/webm', '']
			: ['audio/webm', 'audio/ogg', ''];

		for (const mimeType of mimeTypes) {
			if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
				return mimeType
					? { mimeType, audioBitsPerSecond: SPEECH_AUDIO_BITS_PER_SECOND }
					: { audioBitsPerSecond: SPEECH_AUDIO_BITS_PER_SECOND };
			}
		}

		return { audioBitsPerSecond: SPEECH_AUDIO_BITS_PER_SECOND };
	}

	async startRecording(options = {}) {
		try {
			this.activeRecordingMode = options.transcriptionMode || getTranscriptionMode();

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
			this.activeRecordingSessionId = globalThis.crypto?.randomUUID?.() || String(Date.now());

			if (typeof MediaRecorder === 'undefined') {
				throw new Error('Your browser needs an update to use recording features');
			}

			try {
				this.stream = stream;
				this.mediaRecorder = new MediaRecorder(this.stream, this.#getMediaRecorderOptions());

				await this.initializeAudioContext();
				this.disconnectAudioGraph();

				this.source = this.audioContext.createMediaStreamSource(this.stream);
				this.analyser = this.audioContext.createAnalyser();
				this.analyser.fftSize = 256;
				this.source.connect(this.analyser);

				this.startWaveformMonitoring();
			} catch (mrError) {
				stopMediaStreamTracks(stream);
				throw mrError;
			}

			const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
			this.#resetRecoveryJournalState();
			try {
				await beginRecordingDraftJournal(
					this.activeRecordingSessionId,
					this.#buildRecoveryMetadata(mimeType, 'recording-started')
				);
			} catch (error) {
				log.warn('Failed to start recording recovery journal:', error.message);
			}

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data?.size > 0) {
					this.audioChunks.push(event.data);
					this.#stageRecoveryJournalChunk(event.data, mimeType);

					// Stream to Deepgram only in the resolved live-cloud mode.
					if (this.activeRecordingMode?.useLiveDeepgram) {
						transcriptionStore.send(event.data);
					}
				}
			};
			this.mediaRecorder.onstop = async () => {
				await this.#handleUnexpectedRecorderStop(
					this.mediaRecorder?.mimeType || 'audio/webm',
					this.activeRecordingSessionId
				);
			};
			this.mediaRecorder.onerror = (event) => {
				log.warn(
					'MediaRecorder error while recording:',
					event?.error?.message || event?.error || event
				);
				void this.#checkpointRecordingDraft(
					this.mediaRecorder?.mimeType || 'audio/webm',
					this.activeRecordingSessionId,
					'recorder-error'
				);
			};

			// Use smaller timeslice (250ms) to capture audio more frequently
			// This helps prevent losing the last bit of audio
			this.mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS);
			this.stateManager.setState(AudioStates.RECORDING);
			void this.requestScreenWakeLock();

			// Update the store with mimeType
			audioState.update((current) => ({
				...current,
				mimeType
			}));

			// Connect to Deepgram only in the resolved live-cloud mode.
			if (this.activeRecordingMode?.useLiveDeepgram) {
				transcriptionStore.connect().catch((err) => {
					log.error('Failed to connect to Deepgram:', err);
					// Don't fail recording, just fallback to batch
				});
			}

			return true;
		} catch (error) {
			log.error('Error starting recording:', error);
			this.stateManager.setState(AudioStates.ERROR, { error });

			const friendlyMessage = isPermissionError(error)
				? 'The mic needs permission before the ghost can listen.'
				: 'Recording needs one more try.';
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
		if (this.stopPromise) {
			return this.stopPromise;
		}

		this.stopPromise = new Promise((resolve) => {
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
			const sessionId = this.activeRecordingSessionId;

			// Request any remaining data before stopping
			// This ensures we capture audio right up to when stop was pressed
			if (this.mediaRecorder.state === 'recording') {
				this.mediaRecorder.requestData();
			}

			// Assign onstop BEFORE calling stop() to avoid race condition
			// where stop fires synchronously and the handler isn't attached yet
			this.mediaRecorder.onstop = async () => {
				await this.#flushRecoveryJournal(mimeType, sessionId, 'stopped', {
					forceMetadataUpdate: true
				});
				// Create the Blob from this.audioChunks, which now contains all chunks
				// including the final one from the last dataavailable event.
				const audioBlob = new Blob(this.audioChunks, { type: mimeType });
				log.log('Created audio blob:', audioBlob.size, 'bytes, type:', mimeType);

				// Update store with audio blob
				audioActions.setAudioBlob(audioBlob, mimeType);

				this.disconnectAudioGraph();
				void this.releaseScreenWakeLock();

				if (this.shouldKeepStreamWarm()) {
					this.scheduleWarmStreamRelease();
				} else {
					this.stopStreamTracks();
				}

				this.audioChunks = [];
				this.mediaRecorder = null;
				this.activeRecordingSessionId = null;
				this.activeRecordingMode = null;
				this.#clearRecoveryJournalFlushTimer();

				// Persist before transcription starts so success cleanup cannot race a late draft write.
				await this.#persistRecordingDraft(audioBlob, mimeType, {
					recovery: {
						isPartial: false,
						reason: 'stopped',
						checkpointedAt: new Date().toISOString()
					}
				});

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
					this.activeRecordingSessionId = null;
					this.activeRecordingMode = null;
					this.#clearRecoveryJournalFlushTimer();
					this.stateManager.setState(AudioStates.IDLE);
					resolve(null);
				}
			}, FINAL_AUDIO_CHUNK_DELAY_MS);
		}).finally(() => {
			this.stopPromise = null;
		});

		return this.stopPromise;
	}

	#resetRecoveryJournalState() {
		this.#clearRecoveryJournalFlushTimer();
		this.recoveryJournalBuffer = [];
		this.recoveryJournalSequence = 0;
		this.recoveryJournalTotalSize = 0;
		this.recoveryJournalWriteQueue = Promise.resolve();
	}

	#clearRecoveryJournalFlushTimer() {
		if (this.recoveryJournalFlushTimeout) {
			clearTimeout(this.recoveryJournalFlushTimeout);
			this.recoveryJournalFlushTimeout = null;
		}
	}

	#stageRecoveryJournalChunk(chunk, mimeType) {
		if (!browser || !chunk || chunk.size <= 0 || !this.activeRecordingSessionId) return;

		const sessionId = this.activeRecordingSessionId;
		this.recoveryJournalBuffer.push(chunk);
		this.recoveryJournalTotalSize += chunk.size;

		if (this.recoveryJournalBuffer.length >= RECOVERY_JOURNAL_MAX_BUFFERED_CHUNKS) {
			this.#clearRecoveryJournalFlushTimer();
			void this.#flushRecoveryJournal(mimeType, sessionId, 'chunk-journal');
			return;
		}

		if (!this.recoveryJournalFlushTimeout) {
			this.recoveryJournalFlushTimeout = setTimeout(() => {
				this.recoveryJournalFlushTimeout = null;
				void this.#flushRecoveryJournal(mimeType, sessionId, 'timed-journal');
			}, RECOVERY_JOURNAL_FLUSH_MS);
		}
	}

	#buildRecoveryMetadata(mimeType, reason, overrides = {}) {
		const checkpointedAt = new Date().toISOString();
		const durationFromStore = get(recordingState)?.duration;
		const duration =
			typeof durationFromStore === 'number'
				? durationFromStore
				: this.recoveryJournalTotalSize / 2000;
		const liveTranscript = transcriptionStore.getTranscriptSnapshot?.();
		const liveText = liveTranscript?.text?.trim();

		return {
			mimeType,
			size: this.recoveryJournalTotalSize,
			duration,
			sampleRate: 16000,
			chunkCount: this.recoveryJournalSequence,
			...(liveText
				? {
						liveTranscript: {
							text: liveText,
							finalText: liveTranscript.finalText,
							interimText: liveTranscript.interimText,
							usedInterim: liveTranscript.usedInterim,
							snapshotAt: checkpointedAt
						}
					}
				: {}),
			...overrides,
			recovery: {
				isPartial: true,
				reason,
				checkpointedAt,
				...(overrides.recovery || {})
			}
		};
	}

	async #writePendingDraftFromJournal(draft, metadata) {
		if (!draft) return;

		transcriptionActions.setPendingRecording({
			id: draft.id,
			createdAt: draft.createdAt,
			...(draft.metadata || metadata || {})
		});
	}

	async #flushRecoveryJournal(mimeType, sessionId, reason, options = {}) {
		if (!browser || !sessionId || sessionId !== this.activeRecordingSessionId) return;

		if (options.requestData && this.mediaRecorder?.state === 'recording') {
			try {
				this.mediaRecorder.requestData();
				await new Promise((resolve) => setTimeout(resolve, RECOVERY_CHECKPOINT_SETTLE_MS));
			} catch (error) {
				log.warn('Failed to request checkpoint audio data:', error.message);
			}
		}

		if (sessionId !== this.activeRecordingSessionId) return;

		this.#clearRecoveryJournalFlushTimer();
		const chunksToFlush = this.recoveryJournalBuffer.splice(0);
		const sequence = chunksToFlush.length ? this.recoveryJournalSequence : null;
		if (sequence !== null) {
			this.recoveryJournalSequence += 1;
		}
		const metadata = this.#buildRecoveryMetadata(mimeType, reason, {
			chunkCount: this.recoveryJournalSequence
		});

		if (
			!chunksToFlush.length &&
			(!options.forceMetadataUpdate ||
				this.recoveryJournalSequence <= 0 ||
				this.recoveryJournalTotalSize <= 0)
		) {
			return;
		}

		this.recoveryJournalWriteQueue = this.recoveryJournalWriteQueue
			.catch(() => undefined)
			.then(async () => {
				if (sessionId !== this.activeRecordingSessionId && !options.allowStaleSession) return null;

				if (chunksToFlush.length) {
					const journalBlob = new Blob(chunksToFlush, { type: mimeType });
					if (journalBlob.size <= 0) return null;

					return appendRecordingDraftJournalChunk(sessionId, sequence, journalBlob, metadata);
				}

				return updateRecordingDraftJournalMetadata(sessionId, metadata);
			})
			.then((draft) => this.#writePendingDraftFromJournal(draft, metadata))
			.catch((error) => {
				log.warn('Failed to write recording recovery journal:', error.message);
			});

		await this.recoveryJournalWriteQueue;
	}

	async #checkpointRecordingDraft(mimeType, sessionId, reason) {
		if (!browser || this.recoveryCheckpointInFlight) return;
		if (!sessionId || sessionId !== this.activeRecordingSessionId) return;

		this.recoveryCheckpointInFlight = true;

		try {
			await this.#flushRecoveryJournal(mimeType, sessionId, reason, {
				requestData: true,
				forceMetadataUpdate: true
			});
		} catch (error) {
			log.warn('Failed to checkpoint recording draft:', error.message);
		} finally {
			this.recoveryCheckpointInFlight = false;
		}
	}

	async #handleUnexpectedRecorderStop(mimeType, sessionId) {
		if (!sessionId || sessionId !== this.activeRecordingSessionId) return;

		try {
			await this.#flushRecoveryJournal(mimeType, sessionId, 'recording-interrupted', {
				forceMetadataUpdate: true
			});
			const audioBlob = new Blob(this.audioChunks, { type: mimeType });
			if (audioBlob.size > 0) {
				audioActions.setAudioBlob(audioBlob, mimeType);
				await this.#persistRecordingDraft(audioBlob, mimeType, {
					recovery: {
						isPartial: false,
						reason: 'recording-interrupted',
						checkpointedAt: new Date().toISOString()
					}
				});
				uiActions.setErrorMessage('Recording was interrupted. Your saved draft is ready to retry.');
			}
		} catch (error) {
			log.warn('Failed to save interrupted recording:', error.message);
		} finally {
			this.disconnectAudioGraph();
			void this.releaseScreenWakeLock();
			if (this.shouldKeepStreamWarm()) {
				this.scheduleWarmStreamRelease();
			} else {
				this.stopStreamTracks();
			}
			this.audioChunks = [];
			this.mediaRecorder = null;
			this.activeRecordingSessionId = null;
			this.activeRecordingMode = null;
			this.#clearRecoveryJournalFlushTimer();
			this.stateManager.setState(AudioStates.IDLE);
		}
	}

	async #persistRecordingDraft(audioBlob, mimeType, metadata = {}) {
		if (!browser || !audioBlob) return;

		try {
			const durationFromStore = get(recordingState)?.duration;
			const duration =
				typeof durationFromStore === 'number' ? durationFromStore : audioBlob.size / 2000;

			const draft = await saveRecordingDraft(audioBlob, {
				mimeType,
				size: audioBlob.size,
				duration,
				sampleRate: 16000,
				...metadata
			});

			if (draft) {
				transcriptionActions.setPendingRecording({
					id: draft.id,
					createdAt: draft.createdAt,
					...(draft.metadata || {}),
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
		if (browser && this.visibilityChangeHandler) {
			document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
			this.visibilityChangeHandler = null;
		}

		this.cancelWarmStreamRelease();
		await this.releaseScreenWakeLock();
		if (this.stateManager.getState() === AudioStates.RECORDING && this.activeRecordingSessionId) {
			await this.#flushRecoveryJournal(
				this.mediaRecorder?.mimeType || 'audio/webm',
				this.activeRecordingSessionId,
				'cleanup',
				{ requestData: true, forceMetadataUpdate: true }
			);
		}
		this.activeRecordingSessionId = null;
		this.#clearRecoveryJournalFlushTimer();
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
					}, CLEANUP_RECORDER_STOP_TIMEOUT_MS);

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
							setTimeout(resolve, TRACK_STOP_TIMEOUT_MS);
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
						await new Promise((resolve) => setTimeout(resolve, IOS_AUDIO_CONTEXT_RETRY_DELAY_MS));
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
			this.activeRecordingMode = null;
			this.recoveryCheckpointInFlight = false;

			if (this.isIOS) {
				await new Promise((resolve) => setTimeout(resolve, IOS_CLEANUP_SETTLE_MS));
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

		stopMediaStreamTracks(this.stream);
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

	async requestScreenWakeLock() {
		if (!browser || this.wakeLockSentinel || document.visibilityState !== 'visible') {
			return false;
		}

		if (typeof navigator.wakeLock?.request !== 'function') {
			return false;
		}

		try {
			const sentinel = await navigator.wakeLock.request('screen');
			this.wakeLockSentinel = sentinel;
			sentinel.addEventListener?.('release', () => {
				if (this.wakeLockSentinel === sentinel) {
					this.wakeLockSentinel = null;
				}
			});
			return true;
		} catch (error) {
			log.warn('Screen Wake Lock request failed:', error?.message || error);
			this.wakeLockSentinel = null;
			return false;
		}
	}

	async releaseScreenWakeLock() {
		const sentinel = this.wakeLockSentinel;
		this.wakeLockSentinel = null;

		if (!sentinel || typeof sentinel.release !== 'function') {
			return;
		}

		try {
			await sentinel.release();
		} catch (error) {
			log.warn('Screen Wake Lock release failed:', error?.message || error);
		}
	}
}

export const audioService = new AudioService();
