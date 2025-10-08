import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

// Initialize Gemini (server-side only)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Using Gemini 2.0 Flash (same model as RiffRap)
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
		standard:
			"Transcribe this audio file accurately and completely. Remove filler words like 'um', 'uh', 'like' when they don't add meaning. IMPORTANT: If you detect the same phrase repeating multiple times (like 'So we have a lot of options' repeated 3+ times), this is likely an audio loop or echo - transcribe it only ONCE and continue with the rest. Fix any repetitions, loops, or echo artifacts in the speech. Return ONLY the clean transcription text, nothing else.",
		surlyPirate:
			'Transcribe this audio file accurately, but rewrite it in the style of a surly pirate. Use pirate slang, expressions, and attitude. Arr! Return only the pirate-style transcription, no additional text.',
		leetSpeak:
			'Tr4n5cr1b3 th15 4ud10 f1l3 4ccur4t3ly, but c0nv3rt 1t 1nt0 l33t 5p34k. U53 num3r1c 5ub5t1tut10n5 (3=e, 4=a, 1=i, 0=o, 5=s, 7=t) 4nd h4ck3r j4rg0n wh3n p0551bl3. R3turn 0nly th3 l33t 5p34k tr4n5cr1pt10n, n0 4dd1t10n4l t3xt.',
		sparklePop:
			"OMG!!! Transcribe this audio file like TOTALLY accurately, but make it SUPER bubbly and enthusiastic!!! Use LOTS of emojis, exclamation points, and teen slang!!!! Sprinkle in words like 'literally,' 'totally,' 'sooo,' 'vibes,' and 'obsessed'!!! Add sparkle emojis ✨, hearts 💖, and rainbow emojis 🌈 throughout!!! Make it EXTRA and over-the-top excited!!!",
		codeWhisperer:
			'Transcribe this audio file accurately and completely, but reformat it into clear, structured, technical language suitable for a coding prompt. Remove redundancies, organize thoughts logically, use precise technical terminology, and structure content with clear sections. Return only the optimized, programmer-friendly transcription.',
		quillAndInk:
			'Transcribe this audio file with the eloquence and stylistic flourishes of a 19th century Victorian novelist, in the vein of Jane Austen or Charles Dickens. Employ elaborate sentences, period-appropriate vocabulary, literary devices, and a generally formal and ornate prose style. The transcription should maintain the original meaning but transform the manner of expression entirely.'
	};

	return prompts[style] || prompts.standard;
}

export async function POST({ request }) {
	console.log('[API /transcribe] Request received');
	try {
		const { audioData, mimeType, promptStyle } = await request.json();
		console.log('[API /transcribe] Parsed request body');

		if (!audioData || !mimeType) {
			console.error('[API /transcribe] Missing audioData or mimeType');
			return json(
				{
					error: "Hmm, looks like the audio didn't make it through. Mind trying that again?"
				},
				{ status: 400 }
			);
		}

		// Log audio size for debugging
		const audioSizeKB = ((audioData.length * 0.75) / 1024).toFixed(2);
		console.log(`[API /transcribe] Processing audio: ${audioSizeKB}KB, type: ${mimeType}, style: ${promptStyle}`);

		// Get the appropriate prompt for the style
		const prompt = getTranscriptionPrompt(promptStyle);

		// Convert audio data to format Gemini expects
		const audioPart = base64ToGenerativePart(audioData, mimeType);

		// Generate transcription
		console.log('[API /transcribe] Calling Gemini API...');
		const result = await model.generateContent([prompt, audioPart]);
		let transcription = result.response.text();

		// Log transcription length for debugging repetition issues
		console.log(`[API /transcribe] ✅ Transcription complete: ${transcription.length} chars, text: "${transcription.substring(0, 100)}..."`);

		// Aggressive hallucination detection and cleanup
		// Split into sentences and check for exact repetitions
		const sentences = transcription.match(/[^.!?]+[.!?]+/g) || [transcription];
		const cleanedSentences = [];
		const seenSentences = new Set();

		for (const sentence of sentences) {
			const trimmed = sentence.trim();
			// If we've seen this exact sentence before, it's likely a hallucination loop
			if (!seenSentences.has(trimmed)) {
				cleanedSentences.push(trimmed);
				seenSentences.add(trimmed);
			} else {
				console.warn(`[Gemini API] Removed duplicate sentence: "${trimmed}"`);
			}
		}

		// If we removed a lot of duplicates, the model was definitely hallucinating
		if (sentences.length > cleanedSentences.length * 2) {
			console.error(
				`[Gemini API] Heavy hallucination detected: ${sentences.length} sentences reduced to ${cleanedSentences.length}`
			);
		}

		transcription = cleanedSentences.join(' ');

		// Check for obvious repetition patterns (improved detection)
		const words = transcription.split(' ');
		if (words.length > 10) {
			// Check for repetitions of different phrase lengths (3-7 words)
			for (let phraseLength = 3; phraseLength <= 7; phraseLength++) {
				for (let i = 0; i < words.length - phraseLength * 2; i++) {
					const phrase = words.slice(i, i + phraseLength).join(' ');
					const nextPhrase = words.slice(i + phraseLength, i + phraseLength * 2).join(' ');

					if (phrase === nextPhrase) {
						// Check if it repeats a third time
						const thirdPhrase = words.slice(i + phraseLength * 2, i + phraseLength * 3).join(' ');
						if (phrase === thirdPhrase) {
							console.warn(`[Gemini API] Detected repetition: "${phrase}" repeats 3+ times`);
							// Remove excessive repetitions (keep only one instance)
							const pattern = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
							const cleanedTranscription = transcription.replace(
								new RegExp(`(${pattern}\\s*){2,}`, 'gi'),
								phrase + ' '
							);
							return json({ transcription: cleanedTranscription.trim() });
						}
					}
				}
			}
		}

		console.log('[API /transcribe] Sending response to client');
		return json({ transcription });
	} catch (error) {
		console.error('[API /transcribe] ❌ Error:', error.message, error.stack);

		// Friendly error messages based on the error type
		let friendlyMessage = 'Oops, the ghost got a bit confused there. Give it another shot?';

		if (error.message?.includes('quota')) {
			friendlyMessage =
				"The ghost needs a quick breather - we've hit our daily limit. Try again tomorrow?";
		} else if (error.message?.includes('network')) {
			friendlyMessage = "Can't reach the transcription service right now. Check your internet?";
		} else if (error.message?.includes('timeout')) {
			friendlyMessage = 'That took longer than expected. Maybe try a shorter recording?';
		}

		return json(
			{
				error: friendlyMessage
			},
			{ status: 500 }
		);
	}
}
