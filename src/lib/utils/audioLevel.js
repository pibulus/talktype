/**
 * Shared audio-level math for recording feedback UI.
 * Converts an analyser frequency-bin array (Uint8-style values 0-255)
 * into a 0-100 display level tuned for speech.
 */

export function clampLevel(value) {
	return Math.max(0, Math.min(100, value));
}

export function getAudioDisplayLevel(dataArray) {
	if (!dataArray || dataArray.length === 0) return 0;

	let sum = 0;
	let peak = 0;
	let min = 255;
	const topValues = [0, 0, 0, 0, 0, 0];

	for (let i = 0; i < dataArray.length; i++) {
		const value = dataArray[i];
		sum += value;
		peak = Math.max(peak, value);
		min = Math.min(min, value);

		for (let j = 0; j < topValues.length; j++) {
			if (value > topValues[j]) {
				topValues.splice(j, 0, value);
				topValues.pop();
				break;
			}
		}
	}

	const average = sum / dataArray.length;
	const topAverage = topValues.reduce((total, value) => total + value, 0) / topValues.length;

	// Full scale is a raised voice, not a whisper. The previous divisors were
	// tuned for a quiet desktop mic and saturated on everything above room tone —
	// quiet speech already pinned at 100%, so the bars had no range left to show.
	// Calibration is pinned by audioLevel.test.js; retune there, not by eye.
	if (min <= 40) {
		const averageLevel = Math.max(0, average - 8) / 118;
		const topLevel = Math.max(0, topAverage - 30) / 228;
		const peakLevel = Math.max(0, peak - 34) / 230;
		const combined = Math.min(1, Math.max(averageLevel, topLevel, peakLevel));
		return clampLevel(Math.pow(combined, 0.9) * 100);
	}

	// Defensive fallback if the source ever switches to time-domain waveform data.
	let deviationSum = 0;
	let peakDeviation = 0;
	for (let i = 0; i < dataArray.length; i++) {
		const deviation = Math.abs(dataArray[i] - 128);
		deviationSum += deviation;
		peakDeviation = Math.max(peakDeviation, deviation);
	}

	const averageDeviation = deviationSum / dataArray.length;
	const deviationLevel = Math.max(averageDeviation / 26, peakDeviation / 88);
	return clampLevel(Math.pow(deviationLevel, 0.82) * 100);
}
