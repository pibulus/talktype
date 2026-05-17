export const SITE_URL = 'https://talktype.app';
export const SITE_NAME = 'TalkType';

export const DEFAULT_SEO = {
	title: 'TalkType | Free Voice-to-Text Dictation App',
	description:
		'TalkType is a fast, free voice-to-text app for dictation, live transcription, and private offline speech recognition. Tap the ghost, speak, and get editable text.',
	image: '/og-image.png',
	imageAlt: 'TalkType pink ghost mascot with the words voice-to-text that does not suck.',
	locale: 'en_US',
	type: 'website'
};

export function absoluteUrl(path = '/') {
	if (!path) return SITE_URL;
	if (/^https?:\/\//.test(path)) return path;
	return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function createWebApplicationSchema({
	url = SITE_URL,
	name = SITE_NAME,
	description = DEFAULT_SEO.description,
	image = absoluteUrl(DEFAULT_SEO.image)
} = {}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name,
		alternateName: 'TalkType.app',
		url,
		image,
		description,
		applicationCategory: 'UtilitiesApplication',
		applicationSubCategory: 'Speech-to-text transcription',
		operatingSystem: 'Web',
		inLanguage: 'en',
		isAccessibleForFree: true,
		offers: [
			{
				'@type': 'Offer',
				price: '0',
				priceCurrency: 'USD',
				description: 'Free voice-to-text transcription'
			},
			{
				'@type': 'Offer',
				price: '9',
				priceCurrency: 'USD',
				description: 'One-time supporter unlock for transcript history and exports'
			}
		],
		browserRequirements:
			'Requires a modern browser with microphone access. Offline mode uses local speech recognition models.',
		keywords:
			'voice to text, speech to text, dictation app, live transcription, offline transcription, voice typing, PWA'
	};
}
