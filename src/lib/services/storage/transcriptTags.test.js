import { describe, expect, it } from 'vitest';
import {
	cleanTranscriptTags,
	generateTranscriptTags,
	getTranscriptTagPool
} from './transcriptTags.js';

describe('transcriptTags', () => {
	it('generates quiet utility tags without preserving spoken hash tags', () => {
		const tags = generateTranscriptTags(
			'Remember to follow up with the client after the meeting. Do not tag this as #secret.'
		);

		expect(tags).toContain('todo');
		expect(tags).toContain('meeting');
		expect(tags).not.toContain('secret');
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

	it('cleans user-provided tags into stable chips', () => {
		expect(
			cleanTranscriptTags(['#Client Call', 'client-call', 'Very Long Tag Name Past Limit'])
		).toEqual(['client-call', 'very-long-tag-name-past']);
	});
});
