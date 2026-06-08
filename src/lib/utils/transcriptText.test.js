import { describe, expect, it } from 'vitest';
import {
	cleanTranscriptText,
	getTranscriptWordCount,
	insertPlainTranscriptTextIntoControl,
	normalizeTranscriptText
} from './transcriptText.js';

describe('transcriptText utilities', () => {
	it('normalizes browser text quirks without flattening paragraphs', () => {
		expect(normalizeTranscriptText('First\r\nSecond\rThird\u00a0word')).toBe(
			'First\nSecond\nThird word'
		);
	});

	it('cleans text and counts words across line breaks', () => {
		const text = '  hello\n\nthere   friend  ';

		expect(cleanTranscriptText(text)).toBe('hello\n\nthere   friend');
		expect(getTranscriptWordCount(text)).toBe(3);
	});

	it('inserts normalized pasted text into a text control selection', () => {
		const textarea = document.createElement('textarea');
		textarea.value = 'hello friend';
		textarea.setSelectionRange(6, 12);

		const nextValue = insertPlainTranscriptTextIntoControl(textarea, 'world\r\nagain');

		expect(nextValue).toBe('hello world\nagain');
		expect(textarea.value).toBe('hello world\nagain');
		expect(textarea.selectionStart).toBe('hello world\nagain'.length);
	});
});
