import { GoogleGenerativeAI } from '@google/generative-ai';

const genAIKEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!genAIKEY) {
	console.error('VITE_GEMINI_API_KEY is not set in the environment variables.');
}
const genAI = new GoogleGenerativeAI(genAIKEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Track model initialization state
let modelInitialized = false;
let initializationPromise = null;

// Function to preload/initialize the model for faster response
function preloadModel() {
	// Only initialize once
	if (modelInitialized || initializationPromise) {
		return initializationPromise;
	}

			modelInitialized = true;
			return response;
		})
		.catch((error) => {
			console.error('❌ Error preloading speech model:', error);
			// Reset the initialization state so we can try again
			initializationPromise = null;
			throw error;
		});

	return initializationPromise;
}

function blobToGenerativePart(blob) {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64data = reader.result.split(',')[1];
			resolve({
				inlineData: {
					data: base64data,
					mimeType: blob.type
				}
			});
		};
		reader.readAsDataURL(blob);
	});
}

async function generateContent(promptData) {
	try {
		const result = await model.generateContent(promptData);
		return result.response;
	} catch (error) {
		console.error('❌ Error generating content:', error);
		throw new Error('Failed to generate content with Gemini');
	}
}

export const geminiApiService = {
	preloadModel,
	blobToGenerativePart,
	generateContent,

	// Method to get model status
	getModelStatus() {
		return {
			initialized: modelInitialized,
			initializing: !!initializationPromise && !modelInitialized
		};
	}
};
