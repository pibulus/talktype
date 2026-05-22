import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { guardRequest } from '$lib/server/authService.js';
import { transcribeAudio } from '$lib/server/deepgramService.js';
import { verifySupporterToken } from '$lib/server/supporter/licenseCrypto.js';
import { STORAGE_KEYS } from '$lib/constants';

const MAX_UPLOAD_BYTES = Number(env.MAX_UPLOAD_BYTES ?? `${50 * 1024 * 1024}`);

export async function POST(event) {
	try {
		const guardResponse = await guardRequest(event);
		if (guardResponse) {
			return guardResponse;
		}

		// Check supporter status via token cookie or header
		const token = event.cookies.get(STORAGE_KEYS.SUPPORTER_TOKEN);
		const isSupporter = !!(token && verifySupporterToken(token));

		const formData = await event.request.formData();
		const file = formData.get('audio_file');
		const promptStyle = formData.get('prompt_style')?.toString() || 'standard';
		const customPrompt = formData.get('custom_prompt')?.toString() || '';

		if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
			console.error('[API /transcribe] Missing or invalid audio file');
			return json(
				{
					error: 'Hmm, the audio needs one more pass. Mind trying that again?'
				},
				{ status: 400 }
			);
		}

		if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
			const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(1);
			return json(
				{
					error: `That file is a bit too chunky. Please keep recordings under ${mb} MB so the ghost can chew through them.`
				},
				{ status: 413 }
			);
		}

		const audioSizeKB = typeof file.size === 'number' ? (file.size / 1024).toFixed(2) : 'unknown';

		console.log(
			`[API /transcribe] Received ${audioSizeKB}KB of ${file.type || 'audio/webm'}, preferred style: ${promptStyle}, supporter: ${isSupporter}`
		);

		let transcription = '';

		// Routing Logic:
		// 1. Standard -> Deepgram (High Accuracy, premium diarization for supporters)
		// 2. Creative / Custom -> Gemini (High Vibe / Low Cost)
		if (promptStyle === 'standard') {
			console.log('[API /transcribe] Routing to Deepgram (Standard)');
			transcription = await transcribeAudio(file, { diarize: isSupporter });
		} else {
			console.log(`[API /transcribe] Routing to Gemini (${promptStyle})`);
			// Dynamically import Gemini service to keep initial load light

			const { transcribeAudio: transcribeWithGemini } = await import(
				'$lib/server/geminiService.js'
			);
			transcription = await transcribeWithGemini(file, promptStyle, customPrompt);
		}

		return json({ transcription });
	} catch (error) {
		console.error('[API /transcribe] ❌ Error:', error);

		let friendlyMessage = 'The ghost needs one more pass. Give it another shot?';

		const message = error?.message?.toString()?.toLowerCase() ?? '';
		if (message.includes('quota') || message.includes('limit')) {
			friendlyMessage = 'The ghost needs a quick breather. Try again in a moment?';
		} else if (message.includes('network')) {
			friendlyMessage = 'Check your connection, then try transcription again.';
		} else if (message.includes('timeout')) {
			friendlyMessage = 'That took longer than expected. Maybe try a shorter recording?';
		} else if (message.includes('missing gemini api key')) {
			friendlyMessage = 'Style transcription needs server setup before it can run here.';
		} else if (message.includes('missing deepgram api key')) {
			friendlyMessage = 'Transcription needs server setup before it can run here.';
		}

		return json({ error: friendlyMessage }, { status: 500 });
	}
}
