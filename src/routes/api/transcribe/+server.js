import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { guardRequest } from '$lib/server/authService.js';
import { transcribeAudio } from '$lib/server/geminiService.js';

const MAX_UPLOAD_BYTES = Number(env.MAX_UPLOAD_BYTES ?? `${50 * 1024 * 1024}`);

export async function POST(event) {
	try {
		const guardResponse = await guardRequest(event);
		if (guardResponse) {
			return guardResponse;
		}

		const formData = await event.request.formData();
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
			`[API /transcribe] Received ${audioSizeKB}KB of ${file.type || 'audio/webm'}, preferred style: ${promptStyle}`
		);

		const transcription = await transcribeAudio(file, promptStyle);
		
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
		} else if (message.includes('missing gemini api key')) {
            friendlyMessage = 'Server Error: Missing Gemini API key';
        }

		return json({ error: friendlyMessage }, { status: 500 });
	}
}
