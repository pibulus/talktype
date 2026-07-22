// MediaRecorder blobs don't carry a duration; ~2KB/s is a serviceable estimate
// for opus/webm voice recordings when the recording-state clock is unavailable.
const APPROX_VOICE_BYTES_PER_SECOND = 2000;

export function estimateDurationSecondsFromBlob(blob) {
	const size = Number(blob?.size);
	if (!Number.isFinite(size) || size <= 0) return 0;
	return size / APPROX_VOICE_BYTES_PER_SECOND;
}
