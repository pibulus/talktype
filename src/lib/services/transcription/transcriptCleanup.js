// ===================================================================
// Transcript cleanup — filler removal, stutter collapse, custom words
// ===================================================================
// Ported from Handy's audio_toolkit/text.rs (MIT, github.com/cjpais/Handy).
// Pure functions, no dependencies — safe to run on the output of any
// transcription backend (Whisper, Deepgram, Gemini).
//
// Three tools:
//  - filterTranscriptionOutput(text, lang): drops filler words ("um", "uh")
//    using language-aware tables, collapses stutters ("wh wh wh why"),
//    and tidies whitespace. Filler tables know that "um" is a real word in
//    Portuguese and "ha" is real in Spanish, so those only die in English.
//  - applyCustomWords(text, words): fuzzy-corrects the user's own vocabulary
//    ("Charge B" → "ChargeBee", "R and D" → "R&D") via Levenshtein distance,
//    Soundex phonetics, and 1-3 word n-gram matching, preserving case and
//    punctuation.
//  - getStoredCustomWords(): the user's saved word list, for wiring the
//    above into transcription handoff.

export const CUSTOM_WORDS_STORAGE_KEY = 'talktype-custom-words';

// Matching threshold tuned by Handy: lower = stricter. 0.18 corrects close
// misses and phonetic hits without mangling ordinary words.
export const DEFAULT_CUSTOM_WORD_THRESHOLD = 0.18;

// ===================================================================
// Filler tables
// ===================================================================

const FILLER_WORDS_BY_LANGUAGE = {
	en: [
		'uh',
		'um',
		'uhm',
		'umm',
		'uhh',
		'uhhh',
		'ah',
		'hmm',
		'hm',
		'mmm',
		'mm',
		'mh',
		'eh',
		'ehh',
		'ha'
	],
	es: ['ehm', 'mmm', 'hmm', 'hm'],
	pt: ['ahm', 'hmm', 'mmm', 'hm'],
	fr: ['euh', 'hmm', 'hm', 'mmm'],
	de: ['äh', 'ähm', 'hmm', 'hm', 'mmm'],
	it: ['ehm', 'hmm', 'mmm', 'hm'],
	cs: ['ehm', 'hmm', 'mmm', 'hm'],
	pl: ['hmm', 'mmm', 'hm'],
	tr: ['hmm', 'mmm', 'hm'],
	ru: ['хм', 'ммм', 'hmm', 'mmm'],
	uk: ['хм', 'ммм', 'hmm', 'mmm'],
	ar: ['hmm', 'mmm'],
	ja: ['hmm', 'mmm'],
	ko: ['hmm', 'mmm'],
	vi: ['hmm', 'mmm', 'hm'],
	zh: ['hmm', 'mmm']
};

// Conservative universal fallback — no "um", "eh", "ha" (real words in some
// languages).
const FILLER_WORDS_FALLBACK = [
	'uh',
	'uhm',
	'umm',
	'uhh',
	'uhhh',
	'ah',
	'hmm',
	'hm',
	'mmm',
	'mm',
	'mh',
	'ehh'
];

function getFillerWordsForLanguage(lang) {
	const baseLang = String(lang || '')
		.split(/[-_]/)[0]
		.toLowerCase();
	return FILLER_WORDS_BY_LANGUAGE[baseLang] || FILLER_WORDS_FALLBACK;
}

// ===================================================================
// String similarity primitives
// ===================================================================

function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function levenshtein(a, b) {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;

	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	let current = new Array(b.length + 1);

	for (let i = 1; i <= a.length; i++) {
		current[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
			current[j] = Math.min(
				previous[j] + 1,
				current[j - 1] + 1,
				previous[j - 1] + substitutionCost
			);
		}
		[previous, current] = [current, previous];
	}

	return previous[b.length];
}

const SOUNDEX_CODES = {
	b: '1',
	f: '1',
	p: '1',
	v: '1',
	c: '2',
	g: '2',
	j: '2',
	k: '2',
	q: '2',
	s: '2',
	x: '2',
	z: '2',
	d: '3',
	t: '3',
	l: '4',
	m: '5',
	n: '5',
	r: '6'
};

function soundexCode(word) {
	const letters = word.toLowerCase().replace(/[^a-z]/g, '');
	if (!letters) return '';

	let code = letters[0].toUpperCase();
	let previousDigit = SOUNDEX_CODES[letters[0]] || '';

	for (let i = 1; i < letters.length && code.length < 4; i++) {
		const letter = letters[i];
		const digit = SOUNDEX_CODES[letter] || '';

		if (digit && digit !== previousDigit) {
			code += digit;
		}
		// 'h' and 'w' are transparent: a consonant on each side of them still
		// counts as adjacent. Vowels reset the adjacency.
		if (letter !== 'h' && letter !== 'w') {
			previousDigit = digit;
		}
	}

	return code.padEnd(4, '0');
}

export function soundexEquals(a, b) {
	const codeA = soundexCode(a);
	const codeB = soundexCode(b);
	return Boolean(codeA) && codeA === codeB;
}

// ===================================================================
// Custom-word correction
// ===================================================================

function buildMatchKey(word) {
	return Array.from(word.toLowerCase())
		.filter((c) => /[\p{L}\p{N}]/u.test(c))
		.join('');
}

// Strips punctuation from each word, lowercases, and joins without spaces —
// lets "Charge B" match "ChargeBee".
function buildNgram(words) {
	return words.map(buildMatchKey).join('');
}

function buildCustomWordMatchKeys(word, wordIndex) {
	const primaryKey = buildMatchKey(word);
	const keys = [];

	if (primaryKey) {
		keys.push({ wordIndex, key: primaryKey });
	}

	// "R&D" should also match the spoken form "R and D".
	if (word.includes('&')) {
		const expandedKey = buildMatchKey(word.replaceAll('&', ' and '));
		if (expandedKey && expandedKey !== primaryKey) {
			keys.push({ wordIndex, key: expandedKey });
		}
	}

	return keys;
}

function findBestMatch(candidate, customWords, customWordMatchKeys, threshold) {
	if (!candidate || candidate.length > 50) return null;

	let bestMatch = null;
	let bestScore = Infinity;

	for (const { wordIndex, key } of customWordMatchKeys) {
		// Percentage-based length gate (max 25% difference, min 2 chars) —
		// stops n-grams from matching much shorter custom words.
		const lengthDiff = Math.abs(candidate.length - key.length);
		const maxLength = Math.max(candidate.length, key.length);
		const maxAllowedDiff = Math.max(maxLength * 0.25, 2);
		if (lengthDiff > maxAllowedDiff) continue;

		const levenshteinScore = maxLength > 0 ? levenshtein(candidate, key) / maxLength : 1;

		// Phonetic hits get a big boost; plain string distance otherwise.
		const combinedScore = soundexEquals(candidate, key) ? levenshteinScore * 0.3 : levenshteinScore;

		if (combinedScore < threshold && combinedScore < bestScore) {
			bestMatch = customWords[wordIndex];
			bestScore = combinedScore;
		}
	}

	return bestMatch === null ? null : { replacement: bestMatch, score: bestScore };
}

function preserveCasePattern(original, replacement) {
	// Mirrors Rust char::is_uppercase: digits/punctuation are NOT uppercase,
	// so "GPT4" is not all-caps and "!hello" doesn't capitalize.
	const chars = Array.from(original);
	if (chars.length && chars.every((c) => /\p{Lu}/u.test(c))) {
		return replacement.toUpperCase();
	}
	if (chars[0] && /\p{Lu}/u.test(chars[0])) {
		return replacement[0] ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
	}
	return replacement;
}

function extractPunctuation(word) {
	const prefixMatch = word.match(/^[^\p{L}\p{N}]*/u);
	const suffixMatch = word.match(/[^\p{L}\p{N}]*$/u);
	const prefix = prefixMatch ? prefixMatch[0] : '';
	// A word that is ALL punctuation would double-count as prefix + suffix.
	const suffix = suffixMatch && prefix.length < word.length ? suffixMatch[0] : '';
	return { prefix, suffix };
}

/**
 * Corrects words in transcribed text against the user's custom vocabulary
 * using Levenshtein + Soundex + greedy longest-first n-gram matching (3→1).
 * Case pattern and surrounding punctuation survive the swap.
 */
export function applyCustomWords(text, customWords, threshold = DEFAULT_CUSTOM_WORD_THRESHOLD) {
	if (!customWords?.length || !text) return text ?? '';

	const customWordMatchKeys = customWords.flatMap((word, index) =>
		buildCustomWordMatchKeys(word, index)
	);

	const words = text.split(/\s+/).filter(Boolean);
	const result = [];
	let i = 0;

	while (i < words.length) {
		let matched = false;

		for (let n = 3; n >= 1; n--) {
			if (i + n > words.length) continue;

			const ngramWords = words.slice(i, i + n);
			const ngram = buildNgram(ngramWords);
			const match = findBestMatch(ngram, customWords, customWordMatchKeys, threshold);

			if (match) {
				const { prefix } = extractPunctuation(ngramWords[0]);
				const { suffix } = extractPunctuation(ngramWords[n - 1]);
				const corrected = preserveCasePattern(ngramWords[0], match.replacement);
				result.push(`${prefix}${corrected}${suffix}`);
				i += n;
				matched = true;
				break;
			}
		}

		if (!matched) {
			result.push(words[i]);
			i++;
		}
	}

	return result.join(' ');
}

// ===================================================================
// Filler + stutter filtering
// ===================================================================

// Collapses 3+ consecutive repeats of the same word to one ("I I I I" → "I").
// Two repeats survive — "no no is fine".
function collapseStutters(text) {
	const words = text.split(/\s+/).filter(Boolean);
	const result = [];
	let i = 0;

	while (i < words.length) {
		const word = words[i];
		const wordLower = word.toLowerCase();

		if (/^\p{L}+$/u.test(wordLower)) {
			let count = 1;
			while (i + count < words.length && words[i + count].toLowerCase() === wordLower) {
				count++;
			}
			result.push(word);
			i += count >= 3 ? count : 1;
		} else {
			result.push(word);
			i++;
		}
	}

	return result.join(' ');
}

/**
 * Cleans raw transcription output: removes filler words for the given
 * language ('en', 'pt-BR', …), collapses stutter artifacts, tidies spaces.
 *
 * customFillerWords: null → language defaults; [] → filtering disabled;
 * [words] → overrides the language table.
 */
export function filterTranscriptionOutput(text, lang = 'en', customFillerWords = null) {
	if (!text) return '';

	const fillerWords = customFillerWords ?? getFillerWordsForLanguage(lang);

	let filtered = text;
	for (const word of fillerWords) {
		// Unicode-aware word boundaries — JS \b is ASCII-only and would miss
		// "äh" or "хм". Optional trailing comma/period rides along.
		const pattern = new RegExp(
			`(?<![\\p{L}\\p{N}])${escapeRegex(word)}(?![\\p{L}\\p{N}])[,.]?`,
			'giu'
		);
		filtered = filtered.replace(pattern, '');
	}

	filtered = collapseStutters(filtered);

	return filtered.replace(/\s{2,}/g, ' ').trim();
}

// ===================================================================
// Stored custom words
// ===================================================================

export function getStoredCustomWords() {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(CUSTOM_WORDS_STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed.filter((w) => typeof w === 'string' && w.trim()) : [];
	} catch {
		return [];
	}
}

export function setStoredCustomWords(words) {
	if (typeof localStorage === 'undefined') return;
	try {
		const clean = (words || []).map((w) => String(w).trim()).filter(Boolean);
		localStorage.setItem(CUSTOM_WORDS_STORAGE_KEY, JSON.stringify(clean));
	} catch {
		// Quota/private-mode failures just mean the list doesn't persist.
	}
}
