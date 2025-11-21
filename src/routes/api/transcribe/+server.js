import { json } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';

const MODEL_ID = 'gemini-2.5-flash-lite';
const GENERATION_CONFIG = {
	temperature: 0.2,
	topP: 0.8,
	topK: 40,
	candidateCount: 1,
	maxOutputTokens: 8192
};

const genAI =
	GEMINI_API_KEY && GEMINI_API_KEY.length > 0
		? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
		: null;

function getTranscriptionPrompt(style = 'standard') {
	const prompts = {
		standard:
			'Transcribe this audio accurately. Remove filler words. If a phrase repeats 3+ times, transcribe it only once. Return only the clean transcription.',
		surlyPirate:
			'Transcribe this audio file accurately, but rewrite it in the style of a surly pirate. Use pirate slang, expressions, and attitude. Arr! Return only the pirate-style transcription, no additional text.',
		leetSpeak:
			'Tr4n5cr1b3 th15 4ud10 f1l3 4ccur4t3ly, but c0nv3rt 1t 1nt0 l33t 5p34k. U53 num3r1c 5ub5t1tut10n5 (3=e, 4=a, 1=i, 0=o, 5=s, 7=t) 4nd h4ck3r j4rg0n wh3n p0551bl3. R3turn 0nly th3 l33t 5p34k tr4n5cr1pt10n, n0 4dd1t10n4l t3xt.',
		sparklePop:
			"OMG!!! Transcribe this audio file like TOTALLY accurately, but make it SUPER bubbly and enthusiastic!!! Use LOTS of emojis, exclamation points, and teen slang!!!! Sprinkle in words like 'literally,' 'totally,' 'sooo,' 'vibes,' and 'obsessed'!!! Add sparkle emojis ✨, hearts 💖, and rainbow emojis 🌈 throughout!!! Make it EXTRA and over-the-top excited!!!",
		codeWhisperer:
			'Transcribe this audio file accurately and completely, but reformat it into clear, structured, technical language suitable for a coding prompt. Remove redundancies, organize thoughts logically, use precise technical terminology, and structure content with clear sections. Return only the optimized, programmer-friendly transcription.',
		quillAndInk:
			'Transcribe this audio file with the eloquence and stylistic flourishes of a 19th century Victorian novelist, in the vein of Jane Austen or Charles Dickens. Employ elaborate sentences, period-appropriate vocabulary, literary devices, and a generally formal and ornate prose style. The transcription should maintain the original meaning but transform the manner of expression entirely.',
		pirateProphet:
			'Transcribe this audio file as the voice of a salty prophet. Keep the original meaning while wrapping it in a short, mystical pirate tone with cryptic warnings.',
		diarist:
			'Transcribe this exactly as spoken and label distinct speaker turns (Speaker 1 / Speaker 2). Include timestamps [HH:MM:SS] every 30 seconds.'
	};

	return prompts[style] || prompts.standard;
}

export async function POST({ request }) {
	if (!genAI) {
		return json({ error: 'Server Error: Missing Gemini API key' }, { status: 500 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('audio_file');
		const promptStyle = formData.get('prompt_style')?.toString() || 'standard';

		if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
			console.error('[API /transcribe] Missing or invalid audio file');
			return json(
				{
					error: "Hmm, looks like the audio file didn't make it through. Mind trying that again?"
				},
				{ status: 400 }
			);
		}

		const mimeType = file.type || 'audio/webm';
		const displayName = file.name || `recording-${Date.now()}`;
		const audioSizeKB = typeof file.size === 'number' ? (file.size / 1024).toFixed(2) : 'unknown';

		console.log(
			`[API /transcribe] Received ${audioSizeKB}KB of ${mimeType} (${displayName}), preferred style: ${promptStyle}`
		);

		const prompt = getTranscriptionPrompt(promptStyle);

		const uploadResult = await genAI.files.upload({
			file,
			config: {
				mimeType,
				displayName
			}
		});

		if (!uploadResult?.uri) {
			throw new Error('File upload to Gemini failed');
		}

		console.log('[API /transcribe] Uploaded audio to Gemini');

		const result = await genAI.models.generateContent({
			model: MODEL_ID,
			contents: [
				{
					parts: [
						{ text: prompt },
						{
							fileData: {
								mimeType: uploadResult.mimeType || mimeType,
								fileUri: uploadResult.uri
							}
						}
					]
				}
			],
			config: GENERATION_CONFIG
		});

		let transcription = result.text || '';

		if (!transcription && result.candidates?.length) {
			const candidate = result.candidates[0];
			const parts = candidate.content?.parts || [];
			transcription = parts
				.map((part) => (part.text ? part.text.trim() : ''))
				.filter(Boolean)
				.join(' ');
		}

		console.log('[API /transcribe] ✅ Transcription complete');

		return json({ transcription });
	} catch (error) {
		console.error('[API /transcribe] ❌ Error:', error);

		let friendlyMessage = 'Oops, the ghost got a bit confused there. Give it another shot?';

		const message = error?.message?.toString()?.toLowerCase() ?? '';
		if (message.includes('quota') || message.includes('limit')) {
			friendlyMessage =
				"The ghost needs a quick breather - we've hit our limit. Try again in a moment?";
		} else if (message.includes('network')) {
			friendlyMessage = "Can't reach the transcription service right now. Check your internet?";
		} else if (message.includes('timeout')) {
			friendlyMessage = 'That took longer than expected. Maybe try a shorter recording?';
		}

		return json({ error: friendlyMessage }, { status: 500 });
	}
}
