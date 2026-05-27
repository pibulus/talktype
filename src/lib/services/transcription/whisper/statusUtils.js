export const WHISPER_CACHE_NAMES = ['transformers-cache', 'whisper-models-v1'];

export const WHISPER_PHASES = {
	IDLE: 'idle',
	CHECKING_CACHE: 'checking-cache',
	LOADING_LIBRARY: 'loading-library',
	DOWNLOADING: 'downloading',
	PREPARING: 'preparing',
	WARMING: 'warming',
	READY: 'ready',
	TRANSCRIBING: 'transcribing',
	ERROR: 'error'
};

export function clampPercent(value, fallback = 0) {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) return fallback;
	return Math.max(0, Math.min(100, Math.round(numericValue)));
}

export function getProgressPercentFromEvent(event) {
	if (!event || typeof event !== 'object') return null;

	const loaded = Number(event.loaded);
	const total = Number(event.total);
	if (Number.isFinite(loaded) && Number.isFinite(total) && total > 0) {
		return clampPercent((loaded / total) * 100);
	}

	const progress = Number(event.progress);
	if (Number.isFinite(progress)) {
		return clampPercent(progress);
	}

	return null;
}

export function isLargeModelFile(file = '') {
	return /\.(onnx|safetensors?|bin)(\?|$)/i.test(String(file));
}

export function getLoadStatusText({ phase, progress = 0, modelName = 'Offline model' } = {}) {
	const safeProgress = clampPercent(progress);

	switch (phase) {
		case WHISPER_PHASES.CHECKING_CACHE:
			return 'Checking offline model';
		case WHISPER_PHASES.LOADING_LIBRARY:
			return 'Starting offline engine';
		case WHISPER_PHASES.DOWNLOADING:
			return safeProgress > 0
				? `Downloading ${modelName} ${safeProgress}%`
				: `Downloading ${modelName}`;
		case WHISPER_PHASES.PREPARING:
			return 'Preparing offline model';
		case WHISPER_PHASES.WARMING:
			return 'Warming up offline model';
		case WHISPER_PHASES.READY:
			return 'Offline model ready';
		case WHISPER_PHASES.TRANSCRIBING:
			return 'Transcribing offline';
		case WHISPER_PHASES.ERROR:
			return 'Offline model needs a retry';
		default:
			return 'Offline model not downloaded yet';
	}
}

export function formatStorageBytes(bytes) {
	const numericBytes = Number(bytes);
	if (!Number.isFinite(numericBytes) || numericBytes <= 0) return null;

	const units = ['B', 'KB', 'MB', 'GB'];
	let value = numericBytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
	return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
