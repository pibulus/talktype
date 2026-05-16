export function isPermissionError(error) {
	const rawError = typeof error === 'string' ? error : '';
	const name = error?.name?.toString().toLowerCase() || '';
	const message = (error?.message || rawError).toString().toLowerCase();

	return (
		name.includes('notallowed') ||
		name.includes('security') ||
		name.includes('permission') ||
		message.includes('permission') ||
		message.includes('not allowed') ||
		message.includes('denied')
	);
}
