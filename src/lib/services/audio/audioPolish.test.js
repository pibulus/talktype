import { describe, expect, it } from 'vitest';
import { encodeWav } from './audioPolish.js';

const headerOf = async (blob) => new DataView(await blob.arrayBuffer());
const str = (view, offset, len) =>
	Array.from({ length: len }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join('');

describe('encodeWav', () => {
	it('writes a valid RIFF/WAVE header with correct sizes', async () => {
		const samples = new Float32Array([0, 0.25, -0.25, 0.5]);
		const blob = encodeWav([samples], 16000);
		expect(blob.type).toBe('audio/wav');
		expect(blob.size).toBe(44 + 4 * 2);

		const v = await headerOf(blob);
		expect(str(v, 0, 4)).toBe('RIFF');
		expect(str(v, 8, 4)).toBe('WAVE');
		expect(v.getUint16(22, true)).toBe(1); // mono
		expect(v.getUint32(24, true)).toBe(16000);
		expect(v.getUint32(40, true)).toBe(8); // data bytes
	});

	it('peak-normalizes to -1 dBFS', async () => {
		const samples = new Float32Array([0.5, -0.5, 0.1]);
		const v = await headerOf(encodeWav([samples], 16000));
		// gain = 0.891 / 0.5 → peak sample lands at ~0.891 * 32767
		const first = v.getInt16(44, true);
		expect(first).toBeGreaterThan(29000);
		expect(first).toBeLessThan(29400);
	});

	it('caps makeup gain at +12 dB for near-silent takes', async () => {
		const samples = new Float32Array([0.01, -0.01]);
		const v = await headerOf(encodeWav([samples], 16000));
		// gain capped at 3.981, NOT boosted to 0.891 — whisper stays a whisper
		const first = v.getInt16(44, true);
		expect(first).toBeLessThan(Math.round(0.05 * 32767));
	});

	it('survives silence without dividing by zero', () => {
		const blob = encodeWav([new Float32Array(4)], 16000);
		expect(blob.size).toBe(44 + 8);
	});

	it('interleaves stereo frames', async () => {
		const left = new Float32Array([0.891, 0]);
		const right = new Float32Array([0, 0.891]);
		const v = await headerOf(encodeWav([left, right], 44100));
		expect(v.getUint16(22, true)).toBe(2);
		expect(v.getInt16(44, true)).not.toBe(0); // L frame 0
		expect(v.getInt16(46, true)).toBe(0); // R frame 0
		expect(v.getInt16(48, true)).toBe(0); // L frame 1
		expect(v.getInt16(50, true)).not.toBe(0); // R frame 1
	});
});
