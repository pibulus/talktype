const DAY_MS = 24 * 60 * 60 * 1000;

function clampNumber(value, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function hashString(value) {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i += 1) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function randomFromHash(hash, offset = 0) {
	const mixed = Math.imul(hash ^ Math.imul(offset + 1, 2654435761), 2246822519);
	return ((mixed >>> 0) % 10000) / 10000;
}

function formatNumber(value, digits = 2) {
	return Number.parseFloat(value.toFixed(digits));
}

export function getLocalDayKey(date = new Date()) {
	const localDate = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(localDate.getTime())) return 'today';

	const year = localDate.getFullYear();
	const month = String(localDate.getMonth() + 1).padStart(2, '0');
	const day = String(localDate.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function getDayOfYear(date = new Date()) {
	const localDate = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(localDate.getTime())) return 1;

	const year = localDate.getFullYear();
	const start = Date.UTC(year, 0, 1);
	const current = Date.UTC(year, localDate.getMonth(), localDate.getDate());
	return Math.floor((current - start) / DAY_MS) + 1;
}

export function buildGhostPersonality({ seed = 0, date = new Date() } = {}) {
	const dayKey = getLocalDayKey(date);
	const dayOfYear = getDayOfYear(date);
	const hash = hashString(`${dayKey}:${dayOfYear}:${clampNumber(seed)}`);
	const moods = ['drift', 'dozy', 'spry', 'loopy'];
	const mood = moods[Math.floor(randomFromHash(hash, 1) * moods.length)] || 'drift';

	const floatX = formatNumber(-1.1 + randomFromHash(hash, 2) * 2.2);
	const floatY = formatNumber(-(3.2 + randomFromHash(hash, 3) * 2.4));
	const floatTilt = formatNumber(-0.65 + randomFromHash(hash, 4) * 1.3);
	const floatScale = formatNumber(1.002 + randomFromHash(hash, 5) * 0.004, 3);
	const floatSpeed = formatNumber(5.4 + randomFromHash(hash, 6) * 2.4);
	const floatDelay = formatNumber(-randomFromHash(hash, 7) * floatSpeed);

	return {
		dayKey,
		mood,
		values: {
			floatX,
			floatY,
			floatTilt,
			floatScale,
			floatSpeed,
			floatDelay
		},
		style: [
			`--ghost-float-x: ${floatX}px`,
			`--ghost-float-y: ${floatY}px`,
			`--ghost-float-tilt: ${floatTilt}deg`,
			`--ghost-float-scale: ${floatScale}`,
			`--ghost-float-speed: ${floatSpeed}s`,
			`--ghost-float-delay: ${floatDelay}s`
		].join('; ')
	};
}

export function pickSpecialAnimation(seed = 0, counter = 0, date = new Date()) {
	const hash = hashString(`${getLocalDayKey(date)}:${clampNumber(seed)}:${counter}`);
	const roll = randomFromHash(hash, 8);

	if (roll < 0.58) return 'spin';
	if (roll < 0.8) return 'peek';
	return 'shimmy';
}
