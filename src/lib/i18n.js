// Minimal locale detection + en/es strings for first-impression surfaces.
// Transcription is already language-agnostic (Deepgram `language: 'multi'`);
// this only localizes the UI copy the user sees before they start talking.
import { browser } from '$app/environment';

export function locale() {
	if (browser && typeof navigator !== 'undefined') {
		const lang = (navigator.language || '').toLowerCase();
		if (lang.startsWith('es')) return 'es';
	}
	return 'en';
}

const strings = {
	en: {
		heroSubtitle:
			'You click the ghost, we do the most. Say it sloppy, get it clean — spooky good, freaky fast.',
		introTitle1: "TalkType's the ",
		introTitleBest: 'best.',
		introTitle2: 'Kick out the rest.',
		introTag: "It's fast, it's fun, it's freaky good.",
		introLine1: "Tap the ghost. Talk. That's it.",
		introLine2: 'Offline mode keeps it on your device.',
		introLine3: 'Save it, restyle it, pick your vibe.',
		introGo: "Let's go"
	},
	es: {
		heroSubtitle:
			'Tú clicas al fantasma, nosotros hacemos lo demás. Habla como sea, sale limpio — endiabladamente bueno y rápido.',
		introTitle1: 'TalkType es ',
		introTitleBest: 'el mejor.',
		introTitle2: 'Fuera con el resto.',
		introTag: 'Es rápido, es divertido, es endiabladamente bueno.',
		introLine1: 'Toca el fantasma. Habla. Ya está.',
		introLine2: 'El modo sin conexión lo mantiene en tu dispositivo.',
		introLine3: 'Guárdalo, dale estilo, elige tu vibra.',
		introGo: 'Vamos'
	}
};

export function t(key) {
	return strings[locale()]?.[key] ?? strings.en[key] ?? key;
}
