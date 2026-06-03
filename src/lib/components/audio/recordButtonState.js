function toNumber(value, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

export function formatDuration(seconds) {
	const safeSeconds = Math.max(0, Math.floor(toNumber(seconds)));
	const minutes = Math.floor(safeSeconds / 60);
	const remainingSeconds = safeSeconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getRecordButtonState({
	recording = false,
	recordingDuration = 0,
	maxDuration = 300,
	warningThreshold = 60,
	dangerThreshold = 10,
	clipboardSuccess = false,
	buttonLabel = 'Say hi'
} = {}) {
	const safeMaxDuration = Math.max(1, toNumber(maxDuration, 300));
	const safeRecordingDuration = Math.max(0, toNumber(recordingDuration));
	const timeRemaining = recording ? Math.max(0, safeMaxDuration - safeRecordingDuration) : 0;
	const warningAt = Math.max(0, toNumber(warningThreshold, 60));
	const dangerAt = Math.max(0, toNumber(dangerThreshold, 10));

	return {
		timeRemaining,
		progressPercentage: recording
			? clamp((safeRecordingDuration / safeMaxDuration) * 100, 0, 100)
			: 0,
		isWarning: recording && timeRemaining <= warningAt,
		isDanger: recording && timeRemaining <= dangerAt,
		isIdlePrimaryCta: !recording && buttonLabel === 'Say hi' && !clipboardSuccess,
		durationLabel: `${formatDuration(safeRecordingDuration)} of ${formatDuration(safeMaxDuration)}`
	};
}
