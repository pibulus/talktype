import { env } from '$env/dynamic/private';

export async function transcribeAudio(file) {
	const apiKey = env.DEEPGRAM_API_KEY;
	if (!apiKey) {
		throw new Error('Server Error: Missing Deepgram API key');
	}

	try {
		const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true', {
			method: 'POST',
			headers: {
				'Authorization': `Token ${apiKey}`,
				'Content-Type': file.type || 'audio/webm'
			},
			body: file
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[DeepgramService] API Error:', response.status, errorData);
			throw new Error(`Deepgram API failed: ${response.statusText}`);
		}

		const data = await response.json();
		
		// Extract transcript from the response
		// Deepgram response structure: results.channels[0].alternatives[0].transcript
		const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

		if (!transcript) {
			console.warn('[DeepgramService] No transcript found in response');
			return '';
		}

		console.log('[DeepgramService] ✅ Transcription complete');
		return transcript;

	} catch (error) {
		console.error('[DeepgramService] ❌ Error:', error);
		throw error;
	}
}
