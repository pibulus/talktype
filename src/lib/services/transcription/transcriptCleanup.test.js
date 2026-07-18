// Ported from Handy's audio_toolkit/text.rs test suite (MIT), plus a few
// JS-specific cases (Unicode boundaries, storage helpers).
import { describe, it, expect } from 'vitest';
import {
	applyCustomWords,
	filterTranscriptionOutput,
	levenshtein,
	soundexEquals
} from './transcriptCleanup.js';

describe('applyCustomWords', () => {
	it('matches exactly', () => {
		expect(applyCustomWords('hello world', ['Hello', 'World'], 0.5)).toBe('Hello World');
	});

	it('matches fuzzily', () => {
		expect(applyCustomWords('helo wrold', ['hello', 'world'], 0.5)).toBe('hello world');
	});

	it('returns text unchanged with empty custom words', () => {
		expect(applyCustomWords('hello world', [], 0.5)).toBe('hello world');
	});

	it('matches two-word n-grams', () => {
		const result = applyCustomWords('il cui nome è Charge B, che permette', ['ChargeBee'], 0.5);
		expect(result).toContain('ChargeBee,');
		expect(result).not.toContain('Charge B');
	});

	it('matches three-word n-grams', () => {
		expect(applyCustomWords('use Chat G P T for this', ['ChatGPT'], 0.5)).toContain('ChatGPT');
	});

	it('prefers longer n-grams', () => {
		expect(applyCustomWords('Open AI GPT model', ['OpenAI', 'GPT'], 0.5)).toBe('OpenAI GPT model');
	});

	it('preserves case across n-gram replacement', () => {
		expect(applyCustomWords('CHARGE B is great', ['ChargeBee'], 0.5)).toContain('CHARGEBEE');
	});

	it('matches custom words containing spaces', () => {
		expect(applyCustomWords('using Mac Book Pro', ['MacBook Pro'], 0.5)).toContain('MacBook');
	});

	it('does not double-count trailing numbers', () => {
		expect(applyCustomWords('use GPT4 for this', ['GPT-4'], 0.5)).not.toContain('GPT-44');
	});

	it('matches ampersand words spoken without the ampersand', () => {
		expect(applyCustomWords('send it to RD for review', ['R&D'], 0.18)).toBe(
			'send it to R&D for review'
		);
	});

	it('matches the spoken "and" form of ampersand words', () => {
		expect(applyCustomWords('send it to R and D for review', ['R&D'], 0.18)).toBe(
			'send it to R&D for review'
		);
	});

	it('preserves ampersand words already correct', () => {
		expect(applyCustomWords('send it to R&D for review', ['R&D'], 0.18)).toBe(
			'send it to R&D for review'
		);
	});

	it('handles empty/nullish text', () => {
		expect(applyCustomWords('', ['word'], 0.5)).toBe('');
		expect(applyCustomWords(null, ['word'], 0.5)).toBe('');
	});
});

describe('filterTranscriptionOutput — fillers', () => {
	it('removes English filler words', () => {
		expect(filterTranscriptionOutput('So uhm I was thinking uh about this', 'en')).toBe(
			'So I was thinking about this'
		);
	});

	it('is case-insensitive', () => {
		expect(filterTranscriptionOutput('UHM this is UH a test', 'en')).toBe('this is a test');
	});

	it('removes fillers with attached punctuation', () => {
		expect(filterTranscriptionOutput("Well, uhm, I think, uh. that's right", 'en')).toBe(
			"Well, I think, that's right"
		);
	});

	it('cleans excess whitespace', () => {
		expect(filterTranscriptionOutput('Hello    world   test', 'en')).toBe('Hello world test');
	});

	it('trims', () => {
		expect(filterTranscriptionOutput('  Hello world  ', 'en')).toBe('Hello world');
	});

	it('combines filler removal, trimming, and whitespace cleanup', () => {
		expect(filterTranscriptionOutput('  Uhm, so I was, uh, thinking about this  ', 'en')).toBe(
			'so I was, thinking about this'
		);
	});

	it('preserves valid text', () => {
		expect(filterTranscriptionOutput('This is a completely normal sentence.', 'en')).toBe(
			'This is a completely normal sentence.'
		);
	});

	it('removes "um" in English', () => {
		expect(filterTranscriptionOutput('um I think um this is good', 'en')).toBe(
			'I think this is good'
		);
	});

	it('preserves "um" in Portuguese (means "a/an")', () => {
		expect(filterTranscriptionOutput('um gato bonito', 'pt')).toBe('um gato bonito');
	});

	it('preserves "ha" in Spanish (means "has")', () => {
		expect(filterTranscriptionOutput('ha sido un buen día', 'es')).toBe('ha sido un buen día');
	});

	it('normalizes region codes ("pt-BR" → "pt")', () => {
		expect(filterTranscriptionOutput('um gato bonito', 'pt-BR')).toBe('um gato bonito');
	});

	it('lets a custom filler list override the language table', () => {
		expect(
			filterTranscriptionOutput('okay so I think right this works', 'en', ['okay', 'right'])
		).toBe('so I think this works');
	});

	it('disables filtering with an empty custom list', () => {
		expect(filterTranscriptionOutput('So uhm I was thinking uh about this', 'en', [])).toBe(
			'So uhm I was thinking uh about this'
		);
	});

	it('uses the conservative fallback for unknown languages', () => {
		expect(filterTranscriptionOutput('uh I think uhm this works', 'xx')).toBe('I think this works');
	});

	it('fallback does not remove "um"', () => {
		expect(filterTranscriptionOutput('um I think this works', 'xx')).toBe('um I think this works');
	});

	it('handles non-ASCII fillers with Unicode boundaries', () => {
		expect(filterTranscriptionOutput('ähm ich denke das funktioniert', 'de')).toBe(
			'ich denke das funktioniert'
		);
	});
});

describe('filterTranscriptionOutput — stutters', () => {
	it('collapses long stutter chains', () => {
		expect(filterTranscriptionOutput('w wh wh wh wh wh wh wh wh wh why', 'en')).toBe('w wh why');
	});

	it('collapses repeated short words', () => {
		expect(filterTranscriptionOutput('I I I I think so so so so', 'en')).toBe('I think so');
	});

	it('collapses repeated longer words', () => {
		expect(filterTranscriptionOutput('Check data doc doc doc doc documentation.', 'en')).toBe(
			'Check data doc documentation.'
		);
	});

	it('collapses mixed-case repetitions', () => {
		expect(filterTranscriptionOutput('No NO no NO no', 'en')).toBe('No');
	});

	it('preserves two repetitions', () => {
		expect(filterTranscriptionOutput('no no is fine', 'en')).toBe('no no is fine');
	});
});

describe('primitives', () => {
	it('levenshtein distance', () => {
		expect(levenshtein('kitten', 'sitting')).toBe(3);
		expect(levenshtein('', 'abc')).toBe(3);
		expect(levenshtein('abc', 'abc')).toBe(0);
	});

	it('soundex equality', () => {
		expect(soundexEquals('Robert', 'Rupert')).toBe(true);
		expect(soundexEquals('hello', 'world')).toBe(false);
		expect(soundexEquals('', '')).toBe(false);
	});
});
