/**
 * Silero VAD (Voice Activity Detection) Service
 * Removes silence from audio before transcription for faster processing
 * Using ONNX model that works in browsers (~1MB)
 */

import { env, AutoProcessor, AutoModelForAudioFrameClassification } from '@xenova/transformers';

// Configure for browser environment with caching
env.allowRemoteModels = true;
env.remoteURL = 'https://huggingface.co/';
// Enable browser cache for models (critical for persistence!)
env.useBrowserCache = true;
// Use IndexedDB for persistent model storage across sessions
env.useIndexedDB = true;

/**
 * Silero VAD Service for browser-based voice activity detection
 */
export class SileroVADService {
	constructor() {
		this.processor = null;
		this.model = null;
		this.isLoading = false;
		this.isLoaded = false;

		// VAD configuration
		this.config = {
			// Minimum speech duration to keep (seconds)
			minSpeechDuration: 0.25,
			// Minimum silence duration to remove (seconds)
			minSilenceDuration: 0.5,
			// Threshold for speech detection (0-1)
			speechThreshold: 0.5,
			// Frame size in samples (for 16kHz audio)
			frameSize: 512,
			// Sample rate
			sampleRate: 16000
		};
	}

	/**
	 * Initialize the VAD model
	 */
	async initialize() {
		if (this.isLoaded || this.isLoading) return;

		this.isLoading = true;

		try {
			console.log('🎤 Loading Silero VAD model...');

			// Load the Silero VAD model from HuggingFace
			// Using the ONNX version optimized for browsers
			this.processor = await AutoProcessor.from_pretrained('onnx-community/silero-vad');
			this.model = await AutoModelForAudioFrameClassification.from_pretrained(
				'onnx-community/silero-vad',
				{
					quantized: true // Use quantized model for smaller size
				}
			);

			this.isLoaded = true;
			console.log('✅ Silero VAD model loaded successfully');
		} catch (error) {
			console.error('Failed to load Silero VAD:', error);

			// Fallback: Try alternative VAD model
			try {
				console.log('Trying alternative VAD model...');
				this.model = await AutoModelForAudioFrameClassification.from_pretrained(
					'Xenova/silero-vad',
					{
						quantized: true
					}
				);
				this.isLoaded = true;
				console.log('✅ Alternative VAD model loaded');
			} catch (fallbackError) {
				console.error('VAD initialization failed:', fallbackError);
				throw new Error('Could not load VAD model');
			}
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Process audio to detect voice activity
	 * @param {Float32Array|AudioBuffer} audio - Input audio
	 * @returns {Object} Segments with speech and processed audio
	 */
	async detectVoiceActivity(audio) {
		if (!this.isLoaded) {
			await this.initialize();
		}

		// Convert audio to Float32Array if needed
		const audioData = this.normalizeAudio(audio);

		// Split audio into frames
		const frames = this.createFrames(audioData);

		// Detect speech in each frame
		const speechProbabilities = await this.detectSpeechFrames(frames);

		// Find speech segments
		const segments = this.findSpeechSegments(speechProbabilities);

		// Extract only speech segments
		const processedAudio = this.extractSpeechSegments(audioData, segments);

		return {
			segments,
			processedAudio,
			originalDuration: audioData.length / this.config.sampleRate,
			processedDuration: processedAudio.length / this.config.sampleRate,
			reductionPercent: ((1 - processedAudio.length / audioData.length) * 100).toFixed(1)
		};
	}

	/**
	 * Normalize audio to Float32Array
	 */
	normalizeAudio(audio) {
		if (audio instanceof Float32Array) {
			return audio;
		}

		if (audio instanceof AudioBuffer) {
			// Get the first channel
			return audio.getChannelData(0);
		}

		if (audio instanceof ArrayBuffer || audio instanceof Uint8Array) {
			// Convert to Float32Array
			const dataView = new DataView(audio instanceof Uint8Array ? audio.buffer : audio);
			const float32 = new Float32Array(dataView.byteLength / 2);

			for (let i = 0; i < float32.length; i++) {
				const int16 = dataView.getInt16(i * 2, true);
				float32[i] = int16 / 32768.0;
			}

			return float32;
		}

		throw new Error('Unsupported audio format');
	}

	/**
	 * Create frames from audio data
	 */
	createFrames(audioData) {
		const frames = [];
		const frameSize = this.config.frameSize;
		const hopSize = Math.floor(frameSize / 2); // 50% overlap

		for (let i = 0; i <= audioData.length - frameSize; i += hopSize) {
			frames.push(audioData.slice(i, i + frameSize));
		}

		return frames;
	}

	/**
	 * Detect speech in frames using the model
	 */
	async detectSpeechFrames(frames) {
		if (!this.model) {
			// Fallback to simple energy-based VAD
			return this.simpleVAD(frames);
		}

		try {
			// Process frames through the model
			const probabilities = [];

			for (const frame of frames) {
				// Run inference on the frame
				const inputs = await this.processor(frame, {
					sampling_rate: this.config.sampleRate,
					return_tensors: 'pt'
				});

				const output = await this.model(inputs);
				const speechProb = output.logits[0][1]; // Speech probability

				probabilities.push(speechProb);
			}

			return probabilities;
		} catch (error) {
			console.warn('Model inference failed, using fallback VAD:', error);
			return this.simpleVAD(frames);
		}
	}

	/**
	 * Simple energy-based VAD fallback
	 */
	simpleVAD(frames) {
		const probabilities = [];

		for (const frame of frames) {
			// Calculate frame energy
			let energy = 0;
			for (let i = 0; i < frame.length; i++) {
				energy += frame[i] * frame[i];
			}
			energy = Math.sqrt(energy / frame.length);

			// Convert energy to probability (0-1)
			// Threshold based on typical speech energy levels
			const probability = Math.min(energy * 10, 1);
			probabilities.push(probability);
		}

		return probabilities;
	}

	/**
	 * Find continuous speech segments from probabilities
	 */
	findSpeechSegments(probabilities) {
		const segments = [];
		const threshold = this.config.speechThreshold;
		const hopSize = this.config.frameSize / 2;
		const minSpeechFrames = Math.floor(
			(this.config.minSpeechDuration * this.config.sampleRate) / hopSize
		);
		const minSilenceFrames = Math.floor(
			(this.config.minSilenceDuration * this.config.sampleRate) / hopSize
		);

		let inSpeech = false;
		let speechStart = 0;
		let silenceCount = 0;

		for (let i = 0; i < probabilities.length; i++) {
			const isSpeech = probabilities[i] > threshold;

			if (isSpeech) {
				if (!inSpeech) {
					// Start of speech segment
					speechStart = i;
					inSpeech = true;
				}
				silenceCount = 0;
			} else {
				if (inSpeech) {
					silenceCount++;

					// End speech segment if silence is long enough
					if (silenceCount >= minSilenceFrames) {
						const speechEnd = i - silenceCount;
						const duration = speechEnd - speechStart;

						// Only keep segments longer than minimum duration
						if (duration >= minSpeechFrames) {
							segments.push({
								start: (speechStart * hopSize) / this.config.sampleRate,
								end: (speechEnd * hopSize) / this.config.sampleRate,
								startSample: speechStart * hopSize,
								endSample: speechEnd * hopSize
							});
						}

						inSpeech = false;
						silenceCount = 0;
					}
				}
			}
		}

		// Handle final segment
		if (inSpeech) {
			const speechEnd = probabilities.length - 1;
			const duration = speechEnd - speechStart;

			if (duration >= minSpeechFrames) {
				segments.push({
					start: (speechStart * hopSize) / this.config.sampleRate,
					end: (speechEnd * hopSize) / this.config.sampleRate,
					startSample: speechStart * hopSize,
					endSample: speechEnd * hopSize
				});
			}
		}

		return segments;
	}

	/**
	 * Extract speech segments from audio
	 */
	extractSpeechSegments(audioData, segments) {
		if (segments.length === 0) {
			// No speech detected, return empty audio
			return new Float32Array(0);
		}

		// Calculate total size needed
		let totalSize = 0;
		for (const segment of segments) {
			totalSize += segment.endSample - segment.startSample;
		}

		// Create output array
		const output = new Float32Array(totalSize);
		let outputIndex = 0;

		// Copy speech segments
		for (const segment of segments) {
			const segmentData = audioData.slice(segment.startSample, segment.endSample);
			output.set(segmentData, outputIndex);
			outputIndex += segmentData.length;
		}

		return output;
	}

	/**
	 * Process audio blob with VAD
	 */
	async processAudioBlob(blob) {
		// Convert blob to array buffer
		const arrayBuffer = await blob.arrayBuffer();
		const audioContext = new AudioContext({ sampleRate: 16000 });
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

		// Process with VAD
		const result = await this.detectVoiceActivity(audioBuffer);

		// Convert processed audio back to blob
		const processedBlob = this.audioToBlob(result.processedAudio);

		return {
			...result,
			blob: processedBlob
		};
	}

	/**
	 * Convert Float32Array to audio blob
	 */
	audioToBlob(float32Array) {
		// Convert to 16-bit PCM
		const buffer = new ArrayBuffer(float32Array.length * 2);
		const view = new DataView(buffer);

		for (let i = 0; i < float32Array.length; i++) {
			const sample = Math.max(-1, Math.min(1, float32Array[i]));
			view.setInt16(i * 2, sample * 0x7fff, true);
		}

		return new Blob([buffer], { type: 'audio/wav' });
	}

	/**
	 * Get VAD statistics
	 */
	getStats() {
		return {
			isLoaded: this.isLoaded,
			config: this.config,
			modelSize: this.model ? '~1MB' : 'Not loaded'
		};
	}
}

// Export singleton instance
export const sileroVAD = new SileroVADService();
