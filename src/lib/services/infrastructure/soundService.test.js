import { describe, expect, it, vi } from 'vitest';
import { createSoundService } from './soundService.js';

class FakeParam {
	constructor(value = 0) {
		this.value = value;
	}

	setValueAtTime(value) {
		this.value = value;
	}

	exponentialRampToValueAtTime(value) {
		this.value = value;
	}
}

class FakeNode {
	constructor() {
		this.connections = [];
		this.disconnected = false;
	}

	connect(node) {
		this.connections.push(node);
		return node;
	}

	disconnect() {
		this.disconnected = true;
	}
}

class FakeOscillator extends FakeNode {
	constructor() {
		super();
		this.type = 'sine';
		this.frequency = new FakeParam(440);
		this.start = vi.fn();
		this.stop = vi.fn();
	}
}

class FakeGain extends FakeNode {
	constructor() {
		super();
		this.gain = new FakeParam(1);
	}
}

class FakeFilter extends FakeNode {
	constructor() {
		super();
		this.frequency = new FakeParam(0);
		this.Q = new FakeParam(0);
		this.type = 'lowpass';
	}
}

class FakePanner extends FakeNode {
	constructor() {
		super();
		this.pan = new FakeParam(0);
	}
}

class FakeCompressor extends FakeNode {
	constructor() {
		super();
		this.threshold = new FakeParam();
		this.knee = new FakeParam();
		this.ratio = new FakeParam();
		this.attack = new FakeParam();
		this.release = new FakeParam();
	}
}

class FakeAudioContext {
	constructor() {
		this.currentTime = 0;
		this.state = 'running';
		this.destination = new FakeNode();
		this.createdOscillators = [];
		this.closed = false;
	}

	createOscillator() {
		const oscillator = new FakeOscillator();
		this.createdOscillators.push(oscillator);
		return oscillator;
	}

	createGain() {
		return new FakeGain();
	}

	createBiquadFilter() {
		return new FakeFilter();
	}

	createStereoPanner() {
		return new FakePanner();
	}

	createDynamicsCompressor() {
		return new FakeCompressor();
	}

	async resume() {
		this.state = 'running';
	}

	async close() {
		this.closed = true;
		this.state = 'closed';
	}
}

describe('SoundService', () => {
	it('no-ops when disabled or WebAudio is unavailable', async () => {
		const disabled = createSoundService({ enabled: false });
		await expect(disabled.play('select')).resolves.toBe(false);

		const noAudio = createSoundService({ host: {}, now: () => 1000 });
		await expect(noAudio.play('select')).resolves.toBe(false);
	});

	it('does not burn cooldown when audio context creation fails', async () => {
		let now = 1000;
		const service = createSoundService({
			host: {},
			now: () => now,
			random: () => 0.5
		});

		await expect(service.play('select')).resolves.toBe(false);

		service.host = { AudioContext: FakeAudioContext };
		now += 1;

		await expect(service.play('select')).resolves.toBe(true);
	});

	it('applies cue cooldown after successful play', async () => {
		let now = 1000;
		const context = new FakeAudioContext();
		const service = createSoundService({
			host: { AudioContext: class extends FakeAudioContext {} },
			contextFactory: function FakeFactory() {
				return context;
			},
			now: () => now,
			random: () => 0.5
		});

		await expect(service.play('select')).resolves.toBe(true);
		now += 20;
		await expect(service.play('select')).resolves.toBe(false);
		now += 60;
		await expect(service.play('select')).resolves.toBe(true);
	});

	it('supports portable cue aliases and custom cue overrides', async () => {
		const context = new FakeAudioContext();
		const service = createSoundService({
			contextFactory: function FakeFactory() {
				return context;
			},
			now: () => 1000,
			random: () => 0.5,
			cues: {
				select: {
					cooldownMs: 0,
					variants: [[{ frequency: 500, duration: 0.04, gain: 0.02, voice: 'tap' }]]
				}
			}
		});

		await expect(service.play('tap')).resolves.toBe(true);
		expect(context.createdOscillators.length).toBeGreaterThan(0);
	});

	it('can dispose and close the audio context', async () => {
		const context = new FakeAudioContext();
		const service = createSoundService({
			contextFactory: function FakeFactory() {
				return context;
			},
			now: () => 1000,
			random: () => 0.5
		});

		await service.play('select');
		await service.dispose({ closeContext: true });

		expect(context.closed).toBe(true);
		expect(service.context).toBe(null);
		expect(service.activeVoices).toBe(0);
	});
});
