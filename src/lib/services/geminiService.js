import { geminiApiService } from './geminiApiService';
import { promptManager } from './promptManager';

// Export the original preloadModel function for backward compatibility
const preloadModel = geminiApiService.preloadModel;

// The main public geminiService object
export const geminiService = {
	// Expose the preload function for hover-based preloading
	preloadModel,

	// Get/set prompt style functions
	getPromptStyle: promptManager.getCurrentStyle,
	setPromptStyle: promptManager.setStyle,
	getAvailableStyles: promptManager.getAvailableStyles,
	subscribeToStyleChanges: promptManager.subscribe,

	async transcribeAudio(audioBlob) {
		try {
			if (!initialized) {
				try {
				} catch (err) {

			// Convert audio to format Gemini can use
			const audioPart = await geminiApiService.blobToGenerativePart(audioBlob);

			// Generate content with both prompt and audio data
			const response = await geminiApiService.generateContent([prompt, audioPart]);
		} catch (error) {
			console.error('❌ Error transcribing audio:', error);
			throw new Error('Failed to transcribe audio with Gemini');
		}
	}
};
