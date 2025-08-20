import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

// Initialize Gemini (server-side only)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Helper to convert base64 to generative part
function base64ToGenerativePart(base64Data, mimeType) {
	return {
		inlineData: {
			data: base64Data,
			mimeType: mimeType
		}
	};
}

// Get the transcription prompt based on style
function getTranscriptionPrompt(style = 'standard') {
	const prompts = {
		standard: "Transcribe this audio file accurately and completely, removing any redundant 'ums,' 'likes', 'uhs', and similar filler words. Return only the cleaned-up transcription, with no additional text.",
		surlyPirate: 'Transcribe this audio file accurately, but rewrite it in the style of a surly pirate. Use pirate slang, expressions, and attitude. Arr! Return only the pirate-style transcription, no additional text.',
		leetSpeak: 'Tr4n5cr1b3 th15 4ud10 f1l3 4ccur4t3ly, but c0nv3rt 1t 1nt0 l33t 5p34k. U53 num3r1c 5ub5t1tut10n5 (3=e, 4=a, 1=i, 0=o, 5=s, 7=t) 4nd h4ck3r j4rg0n wh3n p0551bl3. R3turn 0nly th3 l33t 5p34k tr4n5cr1pt10n, n0 4dd1t10n4l t3xt.',
		sparklePop: "OMG!!! Transcribe this audio file like TOTALLY accurately, but make it SUPER bubbly and enthusiastic!!! Use LOTS of emojis, exclamation points, and teen slang!!!! Sprinkle in words like 'literally,' 'totally,' 'sooo,' 'vibes,' and 'obsessed'!!! Add sparkle emojis ✨, hearts 💖, and rainbow emojis 🌈 throughout!!! Make it EXTRA and over-the-top excited!!!",
		codeWhisperer: 'Transcribe this audio file accurately and completely, but reformat it into clear, structured, technical language suitable for a coding prompt. Remove redundancies, organize thoughts logically, use precise technical terminology, and structure content with clear sections. Return only the optimized, programmer-friendly transcription.',
		quillAndInk: 'Transcribe this audio file with the eloquence and stylistic flourishes of a 19th century Victorian novelist, in the vein of Jane Austen or Charles Dickens. Employ elaborate sentences, period-appropriate vocabulary, literary devices, and a generally formal and ornate prose style. The transcription should maintain the original meaning but transform the manner of expression entirely.'
	};
	
	return prompts[style] || prompts.standard;
}

export async function POST({ request }) {
	try {
		const { audioData, mimeType, promptStyle } = await request.json();
		
		if (!audioData || !mimeType) {
			return json({ 
				error: "Hmm, looks like the audio didn't make it through. Mind trying that again?" 
			}, { status: 400 });
		}
		
		// Get the appropriate prompt for the style
		const prompt = getTranscriptionPrompt(promptStyle);
		
		// Convert audio data to format Gemini expects
		const audioPart = base64ToGenerativePart(audioData, mimeType);
		
		// Generate transcription
		const result = await model.generateContent([prompt, audioPart]);
		const transcription = result.response.text();
		
		return json({ transcription });
		
	} catch (error) {
		console.error('Transcription error:', error);
		
		// Friendly error messages based on the error type
		let friendlyMessage = "Oops, the ghost got a bit confused there. Give it another shot?";
		
		if (error.message?.includes('quota')) {
			friendlyMessage = "The ghost needs a quick breather - we've hit our daily limit. Try again tomorrow?";
		} else if (error.message?.includes('network')) {
			friendlyMessage = "Can't reach the transcription service right now. Check your internet?";
		} else if (error.message?.includes('timeout')) {
			friendlyMessage = "That took longer than expected. Maybe try a shorter recording?";
		}
		
		return json({ 
			error: friendlyMessage 
		}, { status: 500 });
	}
}