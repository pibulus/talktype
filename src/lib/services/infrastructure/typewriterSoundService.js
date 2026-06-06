const DEFAULT_BASE_PATH = '/sounds/keyboard-packs';
const DEFAULT_PACK = 'cherry-mx-black';
const DEFAULT_VOLUME = 0.18;
const DEFAULT_COOLDOWN_MS = 24;
const DEFAULT_MAX_VOICES = 10;
const MIN_GAIN = 0.0001;

const SPECIAL_KEY_IDS = {
	' ': '57',
	Enter: '28',
	Backspace: '14',
	Delete: '14',
	Tab: '15',
	Escape: '41',
	'.': '52',
	',': '51',
	'/': '53',
	';': '39',
	"'": '40',
	'[': '26',
	']': '27',
	'-': '12',
	'=': '13',
	'\\': '43',
	'`': '41'
};

const EDIT_CONTROL_KEYS = new Set(['Backspace', 'Delete', 'Enter', 'Tab']);
const INPUT_TYPE_KEYS = {
	deleteContentBackward: 'Backspace',
	deleteContentForward: 'Backspace',
	deleteByCut: 'Backspace',
	insertParagraph: 'Enter',
	insertLineBreak: 'Enter',
	insertFromYank: ' '
};

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function getDefaultHost() {
	return typeof window !== 'undefined' ? window : null;
}

function isResponseOk(response) {
	return !('ok' in response) || response.ok;
}

async function decodeAudioData(context, arrayBuffer) {
	if (context.decodeAudioData.length > 1) {
		return new Promise((resolve, reject) => {
			context.decodeAudioData(arrayBuffer, resolve, reject);
		});
	}

	return context.decodeAudioData(arrayBuffer);
}

export class TypewriterSoundService {
	constructor(options = {}) {
		this.enabled = options.enabled ?? true;
		this.volume = clamp(options.volume ?? DEFAULT_VOLUME, 0, 1);
		this.pack = options.pack || DEFAULT_PACK;
		this.basePath = options.basePath || DEFAULT_BASE_PATH;
		this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
		this.maxVoices = options.maxVoices ?? DEFAULT_MAX_VOICES;
		this.host = options.host ?? getDefaultHost();
		this.contextFactory = options.contextFactory;
		this.fetchImpl = options.fetchImpl;
		this.now = options.now || (() => Date.now());

		this.context = null;
		this.loadedPack = null;
		this.loadingPack = null;
		this.loadingPromise = null;
		this.audioBuffer = null;
		this.configData = null;
		this.lastPlayedAt = -Infinity;
		this.activeVoices = 0;
		this.cleanupTimers = new Set();
	}

	isLoaded(pack = this.pack) {
		return Boolean(this.audioBuffer && this.configData && this.loadedPack === pack);
	}

	getFetch() {
		return (
			this.fetchImpl || this.host?.fetch?.bind(this.host) || globalThis.fetch?.bind(globalThis)
		);
	}

	getAudioContextClass() {
		return this.contextFactory || this.host?.AudioContext || this.host?.webkitAudioContext;
	}

	getContext() {
		if (!this.enabled) return null;

		const AudioContextClass = this.getAudioContextClass();
		if (!AudioContextClass) return null;

		try {
			if (!this.context || this.context.state === 'closed') {
				this.context = new AudioContextClass();
			}

			return this.context;
		} catch {
			return null;
		}
	}

	async resumeContext(context) {
		if (!context || context.state !== 'suspended') return context;

		try {
			await context.resume?.();
		} catch {
			return null;
		}

		return context.state === 'suspended' ? null : context;
	}

	async init(packName = this.pack) {
		if (!this.enabled) return false;
		if (this.isLoaded(packName)) return true;

		if (this.loadingPromise && this.loadingPack === packName) {
			return this.loadingPromise;
		}

		this.loadingPack = packName;
		this.loadingPromise = this.loadPack(packName).finally(() => {
			this.loadingPromise = null;
			this.loadingPack = null;
		});

		return this.loadingPromise;
	}

	async loadPack(packName) {
		const context = this.getContext();
		const fetcher = this.getFetch();
		if (!context || !fetcher) return false;

		try {
			const basePath = `${this.basePath}/${packName}`;
			const [configResponse, audioResponse] = await Promise.all([
				fetcher(`${basePath}/config.json`),
				fetcher(`${basePath}/sound.ogg`)
			]);

			if (!isResponseOk(configResponse) || !isResponseOk(audioResponse)) return false;

			const configData = await configResponse.json();
			const arrayBuffer = await audioResponse.arrayBuffer();
			const audioBuffer = await decodeAudioData(context, arrayBuffer);

			this.configData = configData;
			this.audioBuffer = audioBuffer;
			this.loadedPack = packName;
			this.pack = packName;
			return true;
		} catch {
			return false;
		}
	}

	prime() {
		return this.init();
	}

	canPlay(options = {}) {
		if (!this.enabled || this.activeVoices >= this.maxVoices) return false;
		if (options.force || this.cooldownMs <= 0) return true;

		const now = this.now();
		return now - this.lastPlayedAt >= this.cooldownMs;
	}

	markPlayed() {
		this.lastPlayedAt = this.now();
	}

	isEditKeyEvent(event) {
		if (!event || event.defaultPrevented || event.isComposing) return false;

		const key = event.key;
		if (!key) return false;
		if (EDIT_CONTROL_KEYS.has(key)) return true;
		if (event.metaKey || event.ctrlKey || event.altKey) return false;

		return key.length === 1;
	}

	isSupportedInputEvent(event) {
		if (!event || event.defaultPrevented || event.isComposing) return false;

		if (INPUT_TYPE_KEYS[event.inputType]) return true;
		if (event.inputType === 'insertText' || event.inputType === 'insertCompositionText') {
			return Boolean(event.data);
		}

		return false;
	}

	getKeyFromInputEvent(event) {
		if (!this.isSupportedInputEvent(event)) return null;
		if (INPUT_TYPE_KEYS[event.inputType]) return INPUT_TYPE_KEYS[event.inputType];
		return event.data?.[0] || null;
	}

	getKeyId(key) {
		if (SPECIAL_KEY_IDS[key]) return SPECIAL_KEY_IDS[key];

		if (key?.length === 1 && /[a-zA-Z]/.test(key)) {
			return String(key.toUpperCase().charCodeAt(0));
		}

		if (key >= '0' && key <= '9') {
			return key === '0' ? '11' : String(Number.parseInt(key, 10) + 1);
		}

		return '65';
	}

	async playFromKeyboardEvent(event, options = {}) {
		if (!this.isEditKeyEvent(event)) return false;
		return this.playKey(event.key, options);
	}

	async playFromInputEvent(event, options = {}) {
		const key = this.getKeyFromInputEvent(event);
		if (!key) return false;
		return this.playKey(key, options);
	}

	async playKey(key, options = {}) {
		if (!this.enabled || !this.canPlay(options)) {
			this.prime().catch(() => {});
			return false;
		}

		const loaded = await this.init();
		if (!loaded || !this.audioBuffer || !this.configData) return false;

		const keyId = this.getKeyId(key);
		const soundData = this.configData.defines?.[keyId] || this.configData.defines?.['65'];
		if (!soundData) return false;

		const context = await this.resumeContext(this.context);
		if (!context) return false;

		this.markPlayed();
		return this.playSound(context, soundData[0], soundData[1]);
	}

	playSound(context, startMs, durationMs) {
		if (!this.audioBuffer || this.activeVoices >= this.maxVoices) return false;

		try {
			const source = context.createBufferSource();
			const gainNode = context.createGain();
			const duration = Math.max(0.01, durationMs / 1000);
			const startTime = startMs / 1000;
			const playAt = context.currentTime || 0;

			source.buffer = this.audioBuffer;
			gainNode.gain.setValueAtTime(this.volume, playAt);
			gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, playAt + duration + 0.018);

			source.connect(gainNode);
			gainNode.connect(context.destination);

			this.activeVoices++;
			const cleanup = () => {
				this.activeVoices = Math.max(0, this.activeVoices - 1);
				source.disconnect?.();
				gainNode.disconnect?.();
			};

			if (typeof source.addEventListener === 'function') {
				source.addEventListener('ended', cleanup, { once: true });
			} else {
				const timer = setTimeout(
					() => {
						this.cleanupTimers.delete(timer);
						cleanup();
					},
					(duration + 0.05) * 1000
				);
				this.cleanupTimers.add(timer);
			}

			source.start(0, startTime, duration);
			return true;
		} catch {
			return false;
		}
	}

	setEnabled(enabled) {
		this.enabled = Boolean(enabled);
	}

	enable() {
		this.setEnabled(true);
	}

	disable() {
		this.setEnabled(false);
	}

	setVolume(volume) {
		this.volume = clamp(volume, 0, 1);
	}

	async dispose({ closeContext = false } = {}) {
		this.cleanupTimers.forEach((timer) => clearTimeout(timer));
		this.cleanupTimers.clear();
		this.activeVoices = 0;
		this.audioBuffer = null;
		this.configData = null;
		this.loadedPack = null;
		this.loadingPromise = null;
		this.loadingPack = null;

		if (closeContext && this.context?.state !== 'closed') {
			try {
				await this.context.close?.();
			} catch {
				// Typewriter sounds are optional; cleanup should never affect app logic.
			}
		}

		if (closeContext) {
			this.context = null;
		}
	}
}

export function createTypewriterSoundService(options = {}) {
	return new TypewriterSoundService(options);
}

export const typewriterSoundService = new TypewriterSoundService();
