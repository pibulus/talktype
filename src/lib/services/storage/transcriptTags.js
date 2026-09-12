const MAX_AUTO_TAGS = 4;
const MAX_TAG_LENGTH = 24;

// Speech, not prose. This was a generic English-prose stoplist: it caught
// "like" and "just" but let through "they", "know", "going", "yeah", "think"
// — the words that actually top the count in dictated speech. So every long
// ramble tagged itself #going #know #they. Written as one block because it is
// data, and data that needs adding to should be cheap to add to.
const STOP_WORDS = new Set(
	`a about actually after again all almost also although always am an and another any anyone
	anything anyway are around as at away
	back basically be because been before behind being best better between big bit both but by
	call called came can cant come comes coming could couldnt
	day days definitely did didnt different do does doesnt doing done dont down during
	each either else even ever every everyone everything exactly
	feel feels felt few find fine first for found from full fully
	get gets getting give given go goes going gonna good got gotta great guess guy guys
	had half happen happened has have havent having he her here hers herself him himself his
	honestly how however
	i id if im in into is isnt it its itself ive
	just
	keep kept kind kinda knew know known knows
	last later least let lets like little long look looked looking looks lot lots
	made make makes making many maybe me mean means meant might mine more most much must my myself
	need needs never new next nice no nobody not nothing now
	obviously of off often okay old on once one only or other others our ours ourselves out over own
	part people perhaps place pretty probably put
	quick quite
	rather real really right
	said same saw say saying says see seems seen shall she should shouldnt show side since so
	some someone something sometimes somewhere sort sorta still stuff such super sure
	take taken takes talk talking tell than that thats the their theirs them themselves then
	there theres these they theyre thing things think thinking this those though thought three
	through time times to today together told too took totally true try trying two
	under until up upon us use used using usually
	very
	want wanted wanna was wasnt way ways we week weve well went were what whatever when where
	whether which while who whole whom whose why will with within without wont would wouldnt
	yeah year years yes yet you your yours yourself youre`
		.split(/\s+/)
		.filter(Boolean)
);

const TOPIC_RULES = [
	{
		tag: 'todo',
		terms: ['action item', 'call back', 'follow up', 'need to', 'next step', 'remember to', 'todo']
	},
	{
		tag: 'meeting',
		terms: ['agenda', 'client', 'decision', 'discuss', 'meeting', 'minutes', 'standup', 'sync']
	},
	{
		tag: 'idea',
		terms: ['brainstorm', 'concept', 'experiment', 'idea', 'maybe', 'prototype', 'what if']
	},
	{
		tag: 'work',
		terms: ['bug', 'customer', 'deadline', 'deploy', 'feature', 'launch', 'project', 'roadmap']
	},
	{
		tag: 'money',
		terms: ['budget', 'cost', 'invoice', 'paid', 'payment', 'price', 'quote', 'receipt', 'tax']
	},
	{
		tag: 'health',
		terms: ['appointment', 'doctor', 'exercise', 'health', 'medication', 'medicine', 'symptom']
	},
	{
		tag: 'writing',
		terms: ['article', 'chapter', 'draft', 'email', 'post', 'script', 'story', 'write']
	},
	{
		tag: 'shopping',
		terms: ['buy', 'groceries', 'order', 'pickup', 'shopping', 'store']
	},
	{
		tag: 'travel',
		terms: ['airport', 'booking', 'flight', 'hotel', 'train', 'trip']
	},
	{
		tag: 'personal',
		terms: ['birthday', 'dad', 'dinner', 'family', 'friend', 'home', 'mum', 'weekend']
	}
];

function normalizeTag(tag) {
	return String(tag || '')
		.toLowerCase()
		.replace(/^#+/, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.slice(0, MAX_TAG_LENGTH)
		.replace(/^-+|-+$/g, '');
}

function unique(items) {
	return Array.from(new Set(items));
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textHasTerm(text, term) {
	const cleanTerm = term.trim().toLowerCase();
	if (!cleanTerm) return false;

	if (cleanTerm.includes(' ')) {
		return text.includes(cleanTerm);
	}

	return new RegExp(`\\b${escapeRegExp(cleanTerm)}\\b`, 'i').test(text);
}

function tokenize(text) {
	return (
		String(text || '')
			.toLowerCase()
			.replace(/#[\w-]+/g, ' ')
			.match(/[a-z][a-z'-]{2,}/g) || []
	);
}

function scoreTopics(text) {
	return TOPIC_RULES.map((rule) => ({
		tag: rule.tag,
		score: rule.terms.reduce((score, term) => score + (textHasTerm(text, term) ? 1 : 0), 0)
	}))
		.filter((result) => result.score > 0)
		.sort((first, second) => second.score - first.score || first.tag.localeCompare(second.tag))
		.map((result) => result.tag);
}

function scoreExistingTags(text, existingTags) {
	return cleanTranscriptTags(existingTags)
		.map((tag) => {
			const words = tag.split('-').filter(Boolean);
			const score = words.reduce((total, word) => total + (textHasTerm(text, word) ? 1 : 0), 0);
			return { tag, score };
		})
		.filter((result) => result.score > 0)
		.sort((first, second) => second.score - first.score || first.tag.localeCompare(second.tag))
		.map((result) => result.tag);
}

function keywordTags(text) {
	const tokens = tokenize(text);
	const counts = new Map();

	for (const token of tokens) {
		const clean = normalizeTag(token.replace(/'s$/, ''));
		if (!clean || clean.length < 4 || STOP_WORDS.has(clean)) continue;
		counts.set(clean, (counts.get(clean) || 0) + 1);
	}

	// A word that appears once carries no signal — on a short transcript every
	// word is a singleton, so this used to pad every row out to MAX_AUTO_TAGS
	// with whatever sorted first alphabetically (#chip, #judge, #length).
	// No repeat, no tag: better an untagged transcript than a mislabelled one.
	// Two mentions is strong signal in a 40-word note and nothing at all in a
	// 700-word ramble, so the bar rises with the transcript.
	const minCount = tokens.length > 300 ? 3 : 2;

	return Array.from(counts.entries())
		.filter(([, count]) => count >= minCount)
		.sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
		.map(([tag]) => tag);
}

export function cohereTag(tag, existingVocabulary = []) {
	if (!tag || typeof tag !== 'string') return '';
	const raw = tag.toLowerCase().trim().replace(/^#+/, '');
	if (!raw) return '';

	if (!Array.isArray(existingVocabulary) || existingVocabulary.length === 0) {
		return raw;
	}

	const vocab = existingVocabulary.map((v) => String(v).toLowerCase().replace(/^#+/, '').trim());

	if (vocab.includes(raw)) return raw;

	// Plural / Singular
	if (raw.endsWith('ies')) {
		const singular = raw.slice(0, -3) + 'y';
		if (vocab.includes(singular)) return singular;
	}
	if (raw.endsWith('y')) {
		const plural = raw.slice(0, -1) + 'ies';
		if (vocab.includes(plural)) return plural;
	}
	if (raw.endsWith('es') && raw.length > 3) {
		const base = raw.slice(0, -2);
		if (vocab.includes(base)) return base;
	}
	if (raw.endsWith('s') && raw.length > 2) {
		const singular = raw.slice(0, -1);
		if (vocab.includes(singular)) return singular;
	}
	if (!raw.endsWith('s')) {
		const plural = raw + 's';
		if (vocab.includes(plural)) return plural;
	}

	// -ing forms
	if (raw.endsWith('ing') && raw.length > 4) {
		const base = raw.slice(0, -3);
		if (vocab.includes(base)) return base;
		if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
			const single = base.slice(0, -1);
			if (vocab.includes(single)) return single;
		}
	}

	return raw;
}

const HASHTAG_PATTERN = /(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;

export function extractExplicitTags(text, existingVocabulary = []) {
	const input = String(text || '');
	if (!input.includes('#')) return [];

	const tags = [];
	const matches = input.matchAll(HASHTAG_PATTERN);
	for (const match of matches) {
		const raw = match[2].toLowerCase().slice(0, MAX_TAG_LENGTH);
		const tag = normalizeTag(cohereTag(raw, existingVocabulary));
		if (tag && !tags.includes(tag)) {
			tags.push(tag);
		}
		if (tags.length >= MAX_AUTO_TAGS) break;
	}
	return tags;
}

export function cleanTranscriptTags(tags, limit = 12, existingVocabulary = []) {
	if (!Array.isArray(tags)) return [];

	return unique(
		tags.map((tag) => normalizeTag(cohereTag(tag, existingVocabulary))).filter(Boolean)
	).slice(0, limit);
}

export function generateTranscriptTags(text, existingTags = []) {
	const cleanText = String(text || '').toLowerCase();
	if (!cleanText.trim()) return [];

	const explicit = extractExplicitTags(text, existingTags);

	return unique([
		...explicit,
		...scoreExistingTags(cleanText, existingTags),
		...scoreTopics(cleanText),
		...keywordTags(cleanText)
	]).slice(0, MAX_AUTO_TAGS);
}

export function getTranscriptTagPool(transcripts) {
	if (!Array.isArray(transcripts)) return [];

	const counts = new Map();
	for (const transcript of transcripts) {
		for (const tag of cleanTranscriptTags(transcript?.tags || [])) {
			counts.set(tag, (counts.get(tag) || 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
		.map(([tag]) => tag);
}
