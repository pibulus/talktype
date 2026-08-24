import { env } from '$env/dynamic/private';

export function extractDeepgramTranscript(data) {
	const alternative = data?.results?.channels?.[0]?.alternatives?.[0];
	if (!alternative) return '';

	const paragraphList = alternative.paragraphs?.paragraphs;
	if (Array.isArray(paragraphList) && paragraphList.length > 0) {
		const distinctSpeakers = new Set(
			paragraphList.map((p) => p.speaker).filter((s) => s !== undefined && s !== null)
		);

		if (distinctSpeakers.size > 1) {
			const formattedParagraphs = paragraphList
				.map((p) => {
					const text = Array.isArray(p.sentences)
						? p.sentences
								.map((s) => s.text)
								.filter(Boolean)
								.join(' ')
								.trim()
						: '';
					if (!text) return '';
					const speakerLabel =
						p.speaker !== undefined && p.speaker !== null ? `Speaker ${p.speaker}: ` : '';
					return `${speakerLabel}${text}`;
				})
				.filter(Boolean);

			if (formattedParagraphs.length > 0) {
				return formattedParagraphs.join('\n\n');
			}
		}
	}

	return alternative?.paragraphs?.transcript || alternative?.transcript || '';
}

export async function transcribeAudio(file, { diarize = false, paragraphs = true } = {}) {
	const apiKey = env.DEEPGRAM_API_KEY;
	if (!apiKey) {
		throw new Error('Server Error: Missing Deepgram API key');
	}

	try {
		// Using Nova-3 for high accuracy batch transcription.
		// numerals:true keeps number formatting consistent with the live path.
		// language:multi — without it Nova-3 returns an EMPTY transcript for
		// non-English audio (verified with es_MX clips, 2026-08-13).
		const params = new URLSearchParams({
			model: 'nova-3',
			language: 'multi',
			smart_format: 'true',
			numerals: 'true',
			paragraphs: paragraphs ? 'true' : 'false',
			diarize: diarize ? 'true' : 'false'
		});

		const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
			method: 'POST',
			headers: {
				Authorization: `Token ${apiKey}`,
				'Content-Type': file.type || 'audio/webm'
			},
			body: file
		});
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[DeepgramService] API Error:', response.status, errorData);
			throw new Error(
				errorData?.err_msg || errorData?.message || `Deepgram API failed: ${response.status}`
			);
		}

		const data = await response.json();

		const transcript = extractDeepgramTranscript(data);

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
