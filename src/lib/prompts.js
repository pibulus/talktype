export function getTranscriptionPrompt(style = 'standard') {
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
