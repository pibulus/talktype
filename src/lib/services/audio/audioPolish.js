/**
 * audioPolish — the 80/20 voice mastering pass, entirely in the browser.
 *
 * Hand people back cleaner audio than they gave us. The chain is the classic
 * spoken-word rescue, nothing exotic:
 *
 *   high-pass 80 Hz      — drops room rumble, desk thumps, handling noise
 *   peaking +2.5 dB @3k  — a little presence so voices cut through
 *   compressor 3:1       — evens out the leans-in and trails-off
 *   peak normalize -1 dB — healthy loudness without clipping (in the encoder)
 *
 * All native Web Audio nodes rendered through an OfflineAudioContext, which
 * runs much faster than real time. Output is 16-bit PCM WAV — universally
 * openable, no re-encoding wait.
 */

export async function polishAudioBlob(blob) {
	const arrayBuf = await blob.arrayBuffer();

	// decodeAudioData needs a live context; close it as soon as we have samples.
	const AC = window.AudioContext || window.webkitAudioContext;
	const probe = new AC();
	let decoded;
	try {
		decoded = await probe.decodeAudioData(arrayBuf);
	} finally {
		probe.close();
	}

	const ctx = new OfflineAudioContext(decoded.numberOfChannels, decoded.length, decoded.sampleRate);

	const src = ctx.createBufferSource();
	src.buffer = decoded;

	const highpass = ctx.createBiquadFilter();
	highpass.type = 'highpass';
	highpass.frequency.value = 80;
	highpass.Q.value = 0.707;

	const presence = ctx.createBiquadFilter();
	presence.type = 'peaking';
	presence.frequency.value = 3000;
	presence.gain.value = 2.5;
	presence.Q.value = 0.8;

	const comp = ctx.createDynamicsCompressor();
	comp.threshold.value = -24;
	comp.knee.value = 12;
	comp.ratio.value = 3;
	comp.attack.value = 0.003;
	comp.release.value = 0.25;

	src.connect(highpass);
	highpass.connect(presence);
	presence.connect(comp);
	comp.connect(ctx.destination);
	src.start();

	const rendered = await ctx.startRendering();
	const channels = [];
	for (let c = 0; c < rendered.numberOfChannels; c++) {
		channels.push(rendered.getChannelData(c));
	}
	return encodeWav(channels, rendered.sampleRate);
}

/**
 * Pure 16-bit PCM WAV encoder with peak normalization to -1 dBFS.
 * Makeup gain is capped at +12 dB so a near-silent take doesn't get blown up
 * into a wall of hiss. Exported separately so it can be unit-tested without
 * a browser audio stack.
 */
export function encodeWav(channels, sampleRate) {
	const numChannels = channels.length;
	const numFrames = channels[0]?.length ?? 0;

	let peak = 0;
	for (const ch of channels) {
		for (let i = 0; i < ch.length; i++) {
			const v = Math.abs(ch[i]);
			if (v > peak) peak = v;
		}
	}
	const TARGET = 0.891; // -1 dBFS
	const MAX_GAIN = 3.981; // +12 dB
	const gain = peak > 0 ? Math.min(TARGET / peak, MAX_GAIN) : 1;

	const bytesPerFrame = numChannels * 2;
	const dataSize = numFrames * bytesPerFrame;
	const buf = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buf);

	const writeStr = (offset, s) => {
		for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
	};

	writeStr(0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	writeStr(8, 'WAVE');
	writeStr(12, 'fmt ');
	view.setUint32(16, 16, true); // PCM chunk size
	view.setUint16(20, 1, true); // PCM format
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * bytesPerFrame, true);
	view.setUint16(32, bytesPerFrame, true);
	view.setUint16(34, 16, true); // bits per sample
	writeStr(36, 'data');
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < numFrames; i++) {
		for (let c = 0; c < numChannels; c++) {
			const clamped = Math.max(-1, Math.min(1, channels[c][i] * gain));
			view.setInt16(offset, Math.round(clamped * 32767), true);
			offset += 2;
		}
	}

	return new Blob([buf], { type: 'audio/wav' });
}
