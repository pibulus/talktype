import { describe, expect, it } from 'vitest';
import {
	cleanTranscriptTags,
	cohereTag,
	extractExplicitTags,
	generateTranscriptTags,
	getTranscriptTagPool
} from './transcriptTags.js';

describe('transcriptTags', () => {
	it('extracts explicit hashtags with extractExplicitTags', () => {
		expect(extractExplicitTags('Hello #world #ideas', ['idea'])).toEqual(['world', 'idea']);
	});

	it('extracts and prioritizes explicit #hashtags in transcript text', () => {
		const tags = generateTranscriptTags('Remember to buy milk and apples #groceries #urgent');

		expect(tags[0]).toBe('groceries');
		expect(tags[1]).toBe('urgent');
		expect(tags).toContain('shopping');
	});

	it('coheres plurals and verb endings against existing vocabulary', () => {
		const vocab = ['idea', 'meeting', 'shop'];
		expect(cohereTag('ideas', vocab)).toBe('idea');
		expect(cohereTag('meetings', vocab)).toBe('meeting');
		expect(cohereTag('shopping', vocab)).toBe('shop');
	});

	it('prefers existing tag vocabulary when it matches new text', () => {
		const tags = generateTranscriptTags('The billing invoice payment needs a follow up tomorrow.', [
			'billing',
			'launch'
		]);

		expect(tags[0]).toBe('billing');
		expect(tags).toContain('todo');
	});

	it('builds a frequency-sorted pool from saved transcripts', () => {
		const pool = getTranscriptTagPool([
			{ tags: ['work', 'todo'] },
			{ tags: ['Work', '#money'] },
			{ tags: ['idea'] }
		]);

		expect(pool).toEqual(['work', 'idea', 'money', 'todo']);
	});

	it('cleans user-provided tags into stable chips and coheres with vocabulary', () => {
		expect(
			cleanTranscriptTags(['#Client Call', 'client-call', 'Very Long Tag Name Past Limit'])
		).toEqual(['client-call', 'very-long-tag-name-past']);

		expect(cleanTranscriptTags(['#ideas', '#todos'], 12, ['idea', 'todo'])).toEqual([
			'idea',
			'todo'
		]);
	});
});

describe('transcriptTags keyword filler', () => {
	it('does not invent tags from one-off words in a short transcript', () => {
		// Every word here is a singleton — no repeat, no meaningless random tag
		const tags = generateTranscriptTags('Sparkle style test should show a pink chip.');

		expect(tags).toEqual([]);
	});

	it('still tags a word the speaker actually repeats', () => {
		const tags = generateTranscriptTags('Melbourne weather. Melbourne traffic. Melbourne rent.');

		expect(tags).toContain('melbourne');
	});
});
