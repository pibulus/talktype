import { describe, expect, it, vi } from 'vitest';
import { createTypewriterSoundService } from './typewriterSoundService.js';

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

class FakeGain extends FakeNode {
	constructor() {
		super();
		this.gain = new FakeParam(1);
	}
}

class FakeBufferSource extends FakeNode {
	constructor() {
		super();
		this.buffer = null;
		this.start = vi.fn();
	}
}

class FakeAudioContext {
	constructor() {
		this.currentTime = 0;
		this.state = 'running';
		this.destination = new FakeNode();
		this.createdSources = [];
		this.closed = false;
	}

	createBufferSource() {
		const source = new FakeBufferSource();
		this.createdSources.push(source);
		return source;
	}

	createGain() {
		return new FakeGain();
	}

	async decodeAudioData(arrayBuffer) {
		return { duration: 1, arrayBuffer };
	}

	async resume() {
		this.state = 'running';
	}

	async close() {
		this.closed = true;
		this.state = 'closed';
	}
}

function createPackFetch() {
	return vi.fn(async (url) => {
		if (url.endsWith('config.json')) {
			return {
				ok: true,
				json: async () => ({
					defines: {
						14: [200, 50],
						28: [300, 60],
						65: [100, 40]
					}
				})
			};
		}

		return {
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(8)
		};
	});
}

describe('TypewriterSoundService', () => {
	it('filters keyboard events to real transcript editing keys', () => {
		const service = createTypewriterSoundService({ enabled: false });

		expect(service.isEditKeyEvent({ key: 'a' })).toBe(true);
		expect(service.isEditKeyEvent({ key: 'Backspace' })).toBe(true);
		expect(service.isEditKeyEvent({ key: 'Enter' })).toBe(true);
		expect(service.isEditKeyEvent({ key: 'ArrowLeft' })).toBe(false);
		expect(service.isEditKeyEvent({ key: 'c', metaKey: true })).toBe(false);
		expect(service.isEditKeyEvent({ key: 'x', ctrlKey: true })).toBe(false);
	});

	it('loads the sampled pack lazily and plays the matching key segment', async () => {
		const context = new FakeAudioContext();
		const fetchImpl = createPackFetch();
		const service = createTypewriterSoundService({
			contextFactory: function FakeFactory() {
				return context;
			},
			fetchImpl,
			cooldownMs: 0,
			now: () => 1000
		});

		await expect(service.playFromKeyboardEvent({ key: 'a' })).resolves.toBe(true);

		expect(fetchImpl).toHaveBeenCalledWith('/sounds/keyboard-packs/cherry-mx-black/config.json');
		expect(fetchImpl).toHaveBeenCalledWith('/sounds/keyboard-packs/cherry-mx-black/sound.ogg');
		expect(context.createdSources).toHaveLength(1);
		expect(context.createdSources[0].start).toHaveBeenCalledWith(0, 0.1, 0.04);
	});

	it('supports beforeinput as a mobile keyboard fallback without paste noise', async () => {
		const context = new FakeAudioContext();
		const fetchImpl = createPackFetch();
		const service = createTypewriterSoundService({
			contextFactory: function FakeFactory() {
				return context;
			},
			fetchImpl,
			cooldownMs: 0,
			now: () => 1000
		});

		expect(service.isSupportedInputEvent({ inputType: 'insertText', data: 'z' })).toBe(true);
		expect(service.isSupportedInputEvent({ inputType: 'insertFromPaste', data: 'hello' })).toBe(
			false
		);

		await expect(service.playFromInputEvent({ inputType: 'deleteContentBackward' })).resolves.toBe(
			true
		);

		expect(context.createdSources[0].start).toHaveBeenCalledWith(0, 0.2, 0.05);
	});
});
