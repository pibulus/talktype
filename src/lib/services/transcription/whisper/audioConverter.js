/**
 * Audio Format Converter for Whisper Compatibility
 * Converts WebM/Opus and other formats to WAV PCM for optimal Whisper processing
 */

/**
 * Convert audio blob to raw Float32Array for Whisper processing
 */
let sharedAudioContextPromise;

async function getSharedAudioContext() {
	if (typeof window === 'undefined') {
		throw new Error('Audio conversion only available in browser environment');
	}

	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	if (!AudioContextClass) {
		throw new Error('Web Audio API not supported');
	}

	if (!sharedAudioContextPromise) {
		sharedAudioContextPromise = (async () => {
			const context = new AudioContextClass({ sampleRate: 16000 });
			context.addEventListener?.('statechange', () => {
				if (context.state === 'closed') {
					sharedAudioContextPromise = null;
				}
			});
			return context;
		})().catch((error) => {
			sharedAudioContextPromise = null;
			throw error;
		});
	}

	const audioContext = await sharedAudioContextPromise;
	if (audioContext.state === 'closed') {
		sharedAudioContextPromise = null;
		return getSharedAudioContext();
	}

	if (audioContext.state === 'suspended') {
		try {
			await audioContext.resume();
		} catch (error) {
			console.warn('[AudioConverter] Failed to resume AudioContext:', error?.message || error);
		}
	}

	return audioContext;
}

/**
 * Convert audio blob to raw Float32Array for Whisper processing
 */
export async function convertToWAV(audioBlob) {
	const audioContext = await getSharedAudioContext();
	const arrayBuffer = await audioBlob.arrayBuffer();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
	return processAudioForWhisper(audioBuffer);
}

/**
 * Process AudioBuffer for Whisper (mono Float32Array at original sample rate)
 */
function processAudioForWhisper(audioBuffer) {
	const targetSampleRate = 16000; // Whisper requires 16kHz

	// Convert to mono first (AudioContext already resampled to 16kHz)
	const monoBuffer = convertToMono(audioBuffer);
	const trimmedBuffer = trimSilence(monoBuffer, targetSampleRate);
	const normalizedBuffer = normalizeAudio(trimmedBuffer);

	return normalizedBuffer;
}

/**
 * Convert stereo to mono by averaging channels
 */
function convertToMono(audioBuffer) {
	const numChannels = audioBuffer.numberOfChannels;
	if (numChannels === 1) {
		return audioBuffer.getChannelData(0);
	}

	const length = audioBuffer.length;
	const monoData = new Float32Array(length);

	for (let i = 0; i < length; i++) {
		let sum = 0;
		for (let channel = 0; channel < numChannels; channel++) {
			sum += audioBuffer.getChannelData(channel)[i];
		}
		monoData[i] = sum / numChannels;
	}

	return monoData;
}

/**
 * Check if audio format needs conversion for Whisper
 */
export function needsConversion(mimeType) {
	const compatibleFormats = ['audio/wav', 'audio/wave'];
	return !compatibleFormats.some((format) => mimeType?.includes(format));
}

/**
 * Trim leading and trailing silence from audio
 */
function trimSilence(audioData, sampleRate) {
	if (!audioData || audioData.length === 0) {
		return audioData;
	}

	// Silence detection parameters
	const silenceThreshold = 0.01; // Amplitude threshold for silence
	const minSpeechDuration = 0.1; // Minimum 100ms of speech to keep

	const minSpeechSamples = Math.floor(minSpeechDuration * sampleRate);

	// Find start of speech (first non-silence)
	let speechStart = 0;
	for (let i = 0; i < audioData.length; i++) {
		if (Math.abs(audioData[i]) > silenceThreshold) {
			speechStart = i;
			break;
		}
	}

	// Find end of speech (last non-silence, working backwards)
	let speechEnd = audioData.length - 1;
	for (let i = audioData.length - 1; i >= speechStart; i--) {
		if (Math.abs(audioData[i]) > silenceThreshold) {
			speechEnd = i;
			break;
		}
	}

	// Ensure we have minimum speech duration
	if (speechEnd - speechStart < minSpeechSamples) {
		// If very short speech, keep some padding
		speechStart = Math.max(0, speechStart - Math.floor(sampleRate * 0.05)); // 50ms before
		speechEnd = Math.min(audioData.length - 1, speechEnd + Math.floor(sampleRate * 0.05)); // 50ms after
	}

	// Add small padding to preserve natural speech envelope
	const padding = Math.floor(sampleRate * 0.02); // 20ms padding
	speechStart = Math.max(0, speechStart - padding);
	speechEnd = Math.min(audioData.length - 1, speechEnd + padding);

	// Create trimmed array
	const trimmedLength = speechEnd - speechStart + 1;
	const trimmedData = new Float32Array(trimmedLength);

	for (let i = 0; i < trimmedLength; i++) {
		trimmedData[i] = audioData[speechStart + i];
	}

	return trimmedData;
}

/**
 * Normalize audio to optimal range for Whisper
 */
function normalizeAudio(audioData) {
	if (!audioData || audioData.length === 0) {
		return audioData;
	}

	// Find peak amplitude
	let maxAmplitude = 0;
	for (let i = 0; i < audioData.length; i++) {
		const amplitude = Math.abs(audioData[i]);
		if (amplitude > maxAmplitude) {
			maxAmplitude = amplitude;
		}
	}

	// Avoid division by zero and very quiet audio
	if (maxAmplitude < 0.001) {
		return audioData;
	}

	// Normalize to 70% of full scale to prevent clipping and provide headroom
	const targetLevel = 0.7;
	const normalizationFactor = targetLevel / maxAmplitude;

	const normalizedData = new Float32Array(audioData.length);
	for (let i = 0; i < audioData.length; i++) {
		normalizedData[i] = audioData[i] * normalizationFactor;
	}

	return normalizedData;
}
