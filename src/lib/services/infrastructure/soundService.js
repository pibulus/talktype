const MASTER_LEVEL = 0.72;
const MIN_GAIN = 0.0001;
const DEFAULT_VOLUME = 0.85;
const DEFAULT_MAX_VOICES = 14;

const CUE_ALIASES = {
	tap: 'select',
	deny: 'locked',
	success: 'copy',
	done: 'stop'
};

const VOICE_PRESETS = {
	tap: {
		type: 'triangle',
		lowpass: 2800,
		attack: 0.006,
		partials: [{ ratio: 2.01, gain: 0.22, type: 'sine' }]
	},
	bloom: {
		type: 'sine',
		lowpass: 3800,
		attack: 0.01,
		partials: [{ ratio: 1.5, gain: 0.12, type: 'triangle' }]
	},
	knock: {
		type: 'sine',
		lowpass: 1400,
		attack: 0.005,
		bendCents: -60
	},
	sparkle: {
		type: 'sine',
		lowpass: 4300,
		attack: 0.004,
		partials: [{ ratio: 2, gain: 0.16, type: 'sine' }]
	},
	warn: {
		type: 'sine',
		lowpass: 1200,
		attack: 0.007,
		bendCents: -45
	}
};

export const DEFAULT_SOUND_CUES = {
	select: {
		cooldownMs: 55,
		detuneCents: 8,
		gainJitter: 0.12,
		timeJitter: 0.006,
		panJitter: 0.08,
		variants: [
			[
				{
					frequency: 640,
					duration: 0.052,
					gain: 0.026,
					voice: 'tap'
				}
			],
			[
				{
					frequency: 720,
					duration: 0.044,
					gain: 0.022,
					voice: 'bloom'
				}
			]
		]
	},
	locked: {
		cooldownMs: 120,
		detuneCents: 5,
		gainJitter: 0.08,
		timeJitter: 0.004,
		panJitter: 0.03,
		variants: [
			[
				{
					frequency: 260,
					duration: 0.072,
					gain: 0.022,
					voice: 'knock'
				}
			],
			[
				{
					frequency: 310,
					duration: 0.058,
					gain: 0.019,
					voice: 'warn'
				}
			]
		]
	},
	start: {
		cooldownMs: 120,
		detuneCents: 7,
		gainJitter: 0.1,
		timeJitter: 0.006,
		panJitter: 0.07,
		variants: [
			[
				{ frequency: 392, duration: 0.058, gain: 0.027, voice: 'tap' },
				{
					frequency: 588,
					offset: 0.052,
					duration: 0.074,
					gain: 0.023,
					voice: 'bloom'
				}
			],
			[
				{ frequency: 440, duration: 0.046, gain: 0.024, voice: 'tap' },
				{ frequency: 660, offset: 0.044, duration: 0.066, gain: 0.022, voice: 'bloom' }
			]
		]
	},
	stop: {
		cooldownMs: 120,
		detuneCents: 6,
		gainJitter: 0.1,
		timeJitter: 0.006,
		panJitter: 0.05,
		variants: [
			[
				{ frequency: 620, duration: 0.046, gain: 0.024, voice: 'tap' },
				{ frequency: 370, offset: 0.044, duration: 0.08, gain: 0.022, voice: 'knock' }
			],
			[
				{ frequency: 560, duration: 0.048, gain: 0.023, voice: 'tap' },
				{ frequency: 330, offset: 0.044, duration: 0.076, gain: 0.02, voice: 'knock' }
			]
		]
	},
	copy: {
		cooldownMs: 140,
		detuneCents: 9,
		gainJitter: 0.14,
		timeJitter: 0.005,
		panJitter: 0.1,
		variants: [
			[
				{ frequency: 740, duration: 0.038, gain: 0.021, voice: 'sparkle' },
				{ frequency: 932, offset: 0.038, duration: 0.044, gain: 0.019, voice: 'bloom' },
				{ frequency: 1175, offset: 0.076, duration: 0.052, gain: 0.017, voice: 'sparkle' }
			],
			[
				{ frequency: 660, duration: 0.042, gain: 0.02, voice: 'bloom' },
				{ frequency: 990, offset: 0.044, duration: 0.05, gain: 0.018, voice: 'sparkle' },
				{ frequency: 1320, offset: 0.086, duration: 0.05, gain: 0.014, voice: 'sparkle' }
			]
		]
	},
	error: {
		cooldownMs: 160,
		detuneCents: 4,
		gainJitter: 0.08,
		timeJitter: 0.004,
		panJitter: 0.02,
		variants: [
			[
				{ frequency: 250, duration: 0.06, gain: 0.02, voice: 'warn' },
				{ frequency: 210, offset: 0.058, duration: 0.09, gain: 0.018, voice: 'warn' }
			]
		]
	},
	open: {
		cooldownMs: 120,
		detuneCents: 7,
		gainJitter: 0.1,
		timeJitter: 0.006,
		panJitter: 0.06,
		variants: [[{ frequency: 520, duration: 0.05, gain: 0.022, voice: 'tap' }]]
	},
	close: {
		cooldownMs: 120,
		detuneCents: 5,
		gainJitter: 0.08,
		timeJitter: 0.004,
		panJitter: 0.04,
		variants: [[{ frequency: 430, duration: 0.06, gain: 0.02, voice: 'knock' }]]
	}
};

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function centsToRatio(cents) {
	return 2 ** (cents / 1200);
}

function getDefaultHost() {
	return typeof window !== 'undefined' ? window : null;
}

function mergeCues(overrides = {}) {
	return {
		...DEFAULT_SOUND_CUES,
		...overrides
	};
}

export class SoundService {
	constructor(options = {}) {
		this.enabled = options.enabled ?? true;
		this.volume = clamp(options.volume ?? DEFAULT_VOLUME, 0, 1);
		this.randomness = clamp(options.randomness ?? 1, 0, 1.5);
		this.maxVoices = options.maxVoices ?? DEFAULT_MAX_VOICES;
		this.respectVisibility = options.respectVisibility ?? true;
		this.host = options.host ?? getDefaultHost();
		this.contextFactory = options.contextFactory;
		this.now = options.now || (() => Date.now());
		this.random = options.random || (() => Math.random());
		this.cues = mergeCues(options.cues);
		this.context = null;
		this.contextForChain = null;
		this.masterGain = null;
		this.activeVoices = 0;
		this.lastPlayedAt = new Map();
		this.cleanupTimers = new Set();
	}

	async getContext() {
		if (!this.enabled || (!this.host && !this.contextFactory)) return null;

		const AudioContextClass =
			this.contextFactory || this.host?.AudioContext || this.host?.webkitAudioContext;
		if (!AudioContextClass) return null;

		try {
			if (!this.context || this.context.state === 'closed') {
				this.context = new AudioContextClass();
				this.contextForChain = null;
			}

			if (this.context.state === 'suspended') {
				await this.context.resume();
			}

			return this.context.state === 'running' ? this.context : null;
		} catch {
			return null;
		}
	}

	ensureMasterChain(context) {
		if (this.masterGain && this.contextForChain === context) {
			this.masterGain.gain.value = MASTER_LEVEL * this.volume;
			return this.masterGain;
		}

		const masterGain = context.createGain();
		masterGain.gain.value = MASTER_LEVEL * this.volume;

		if (typeof context.createDynamicsCompressor === 'function') {
			const compressor = context.createDynamicsCompressor();
			compressor.threshold?.setValueAtTime?.(-20, context.currentTime);
			compressor.knee?.setValueAtTime?.(18, context.currentTime);
			compressor.ratio?.setValueAtTime?.(4, context.currentTime);
			compressor.attack?.setValueAtTime?.(0.003, context.currentTime);
			compressor.release?.setValueAtTime?.(0.08, context.currentTime);
			masterGain.connect(compressor);
			compressor.connect(context.destination);
		} else {
			masterGain.connect(context.destination);
		}

		this.masterGain = masterGain;
		this.contextForChain = context;
		return masterGain;
	}

	canPlay(cueName, cue, options) {
		if (!this.enabled) return false;
		if (this.activeVoices >= this.maxVoices) return false;
		if (this.respectVisibility && this.host?.document?.hidden) return false;

		const cooldownMs = options.cooldownMs ?? cue.cooldownMs ?? 0;
		if (cooldownMs <= 0 || options.force) return true;

		const now = this.now();
		const lastPlayedAt = this.lastPlayedAt.get(cueName) || 0;
		if (now - lastPlayedAt < cooldownMs) return false;
		return true;
	}

	markPlayed(cueName) {
		this.lastPlayedAt.set(cueName, this.now());
	}

	randomize(value, amount = 0) {
		if (!amount || !this.randomness) return value;
		return value * this.randomBetween(1 - amount * this.randomness, 1 + amount * this.randomness);
	}

	randomBetween(min, max) {
		return min + this.random() * (max - min);
	}

	pick(array) {
		if (!array?.length) return null;
		const index = clamp(Math.floor(this.random() * array.length), 0, array.length - 1);
		return array[index];
	}

	resolveCue(cueName) {
		const resolvedName = CUE_ALIASES[cueName] || cueName;
		return this.cues[resolvedName] || this.cues.select;
	}

	resolveCueName(cueName) {
		return CUE_ALIASES[cueName] || cueName;
	}

	resolveVoice(note) {
		if (!note.voice) return note;
		return {
			...VOICE_PRESETS[note.voice],
			...note,
			partials: note.partials || VOICE_PRESETS[note.voice]?.partials
		};
	}

	getOutputChain(context, note, masterNode) {
		let output = masterNode;
		const cleanupNodes = [];

		if (typeof context.createStereoPanner === 'function') {
			const panner = context.createStereoPanner();
			panner.pan.value = clamp(note.pan || 0, -0.35, 0.35);
			panner.connect(output);
			output = panner;
			cleanupNodes.push(panner);
		}

		if (note.lowpass || note.highpass) {
			const filter = context.createBiquadFilter();
			filter.type = note.highpass ? 'highpass' : 'lowpass';
			filter.frequency.value = note.highpass || note.lowpass;
			if (filter.Q) filter.Q.value = note.q || 0.7;
			filter.connect(output);
			output = filter;
			cleanupNodes.push(filter);
		}

		return { input: output, cleanupNodes };
	}

	scheduleTone(context, cue, note, masterNode) {
		if (this.activeVoices >= this.maxVoices) return;

		const voicedNote = this.resolveVoice(note);
		const timeJitter = cue.timeJitter || 0;
		const delay = Math.max(
			0,
			(voicedNote.offset || 0) + this.randomBetween(-timeJitter, timeJitter)
		);
		const startAt = context.currentTime + delay;
		const duration = Math.max(
			0.025,
			this.randomize(voicedNote.duration || 0.05, cue.timeJitter || 0.004)
		);
		const attack = Math.max(0.004, voicedNote.attack || 0.008);
		const frequency =
			voicedNote.frequency *
			centsToRatio(
				this.randomBetween(-(cue.detuneCents || 0), cue.detuneCents || 0) * this.randomness
			);
		const gainValue = Math.max(
			0.003,
			this.randomize(voicedNote.gain || 0.02, cue.gainJitter || 0.08)
		);
		const pan =
			(voicedNote.pan || 0) +
			this.randomBetween(-(cue.panJitter || 0), cue.panJitter || 0) * this.randomness;
		const shapedNote = { ...voicedNote, pan };

		const partials = [{ ratio: 1, gain: 1, type: shapedNote.type }, ...(shapedNote.partials || [])];
		if (this.activeVoices + partials.length > this.maxVoices) return;

		const noteGain = context.createGain();
		const { input: outputNode, cleanupNodes } = this.getOutputChain(
			context,
			shapedNote,
			masterNode
		);
		noteGain.connect(outputNode);
		noteGain.gain.setValueAtTime(MIN_GAIN, startAt);
		noteGain.gain.exponentialRampToValueAtTime(gainValue, startAt + attack);
		noteGain.gain.exponentialRampToValueAtTime(MIN_GAIN, startAt + duration);

		this.activeVoices += partials.length;
		let remainingPartials = partials.length;

		partials.forEach((partial) => {
			const oscillator = context.createOscillator();
			const partialGain = context.createGain();
			const partialFrequency = frequency * (partial.ratio || 1);
			const partialGainValue = clamp(partial.gain ?? 1, 0, 1);

			oscillator.type = partial.type || shapedNote.type || 'sine';
			oscillator.frequency.setValueAtTime(partialFrequency, startAt);
			if (shapedNote.bendCents) {
				oscillator.frequency.exponentialRampToValueAtTime(
					partialFrequency * centsToRatio(shapedNote.bendCents),
					startAt + duration
				);
			}

			partialGain.gain.value = partialGainValue;
			oscillator.connect(partialGain);
			partialGain.connect(noteGain);
			oscillator.start(startAt);
			oscillator.stop(startAt + duration + 0.03);

			const cleanup = () => {
				this.activeVoices = Math.max(0, this.activeVoices - 1);
				remainingPartials = Math.max(0, remainingPartials - 1);
				oscillator.disconnect?.();
				partialGain.disconnect?.();
				if (remainingPartials === 0) {
					noteGain.disconnect?.();
					cleanupNodes.forEach((node) => node.disconnect?.());
				}
			};

			if (typeof oscillator.addEventListener === 'function') {
				oscillator.addEventListener('ended', cleanup, { once: true });
			} else {
				const timer = setTimeout(
					() => {
						this.cleanupTimers.delete(timer);
						cleanup();
					},
					(delay + duration + 0.05) * 1000
				);
				this.cleanupTimers.add(timer);
			}
		});
	}

	async play(cueName = 'select', options = {}) {
		const resolvedCueName = this.resolveCueName(cueName);
		const cue = this.resolveCue(resolvedCueName);
		if (!this.canPlay(resolvedCueName, cue, options)) return false;

		try {
			const context = await this.getContext();
			if (!context) return false;

			this.markPlayed(resolvedCueName);
			const masterNode = this.ensureMasterChain(context);
			const variant = this.pick(cue.variants || this.cues.select.variants);
			if (!variant) return false;
			variant.forEach((note) => this.scheduleTone(context, cue, note, masterNode));
			return true;
		} catch {
			return false;
		}
	}

	select() {
		return this.play('select');
	}

	locked() {
		return this.play('locked');
	}

	startRecording() {
		return this.play('start');
	}

	stopRecording() {
		return this.play('stop');
	}

	copySuccess() {
		return this.play('copy');
	}

	success() {
		return this.play('copy');
	}

	error() {
		return this.play('error');
	}

	open() {
		return this.play('open');
	}

	close() {
		return this.play('close');
	}

	setVolume(volume) {
		this.volume = clamp(volume, 0, 1);
		if (this.masterGain) {
			this.masterGain.gain.value = MASTER_LEVEL * this.volume;
		}
	}

	setRandomness(randomness) {
		this.randomness = clamp(randomness, 0, 1.5);
	}

	setCue(name, cue) {
		this.cues = {
			...this.cues,
			[name]: cue
		};
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
		try {
			this.context?.suspend?.();
		} catch {
			// Sound is optional; disabling should never affect app logic.
		}
	}

	setEnabled(enabled) {
		if (enabled) this.enable();
		else this.disable();
	}

	async dispose({ closeContext = false } = {}) {
		this.cleanupTimers.forEach((timer) => clearTimeout(timer));
		this.cleanupTimers.clear();
		this.activeVoices = 0;
		this.masterGain?.disconnect?.();
		this.masterGain = null;
		this.contextForChain = null;

		if (closeContext && this.context?.state !== 'closed') {
			try {
				await this.context.close();
			} catch {
				// Closing is a cleanup nicety; never let it leak into app logic.
			}
		}

		if (closeContext) {
			this.context = null;
		}
	}

	isEnabled() {
		return this.enabled;
	}
}

export function createSoundService(options = {}) {
	return new SoundService(options);
}

export const soundService = new SoundService();
