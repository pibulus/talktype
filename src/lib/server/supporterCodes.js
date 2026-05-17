export function normalizeSupporterCode(value) {
	return value?.toString().trim().toUpperCase() || '';
}

export function parseSupporterCodes(...values) {
	return values
		.filter(Boolean)
		.flatMap((value) => value.split(','))
		.map(normalizeSupporterCode)
		.filter(Boolean);
}

export function isSupporterCodeValid(code, validCodes) {
	const normalizedCode = normalizeSupporterCode(code);
	if (!normalizedCode) return false;

	return validCodes.includes(normalizedCode);
}
