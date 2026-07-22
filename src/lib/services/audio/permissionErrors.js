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

/**
 * Maps a getUserMedia/recording error to distinct human copy by err.name —
 * "mic is busy" and "no mic found" deserve different advice than "denied".
 * Falls back to permission copy for permission-shaped errors, then generic.
 */
export function getMicErrorMessage(error) {
	switch (error?.name) {
		case 'NotAllowedError':
		case 'SecurityError':
			return 'The mic needs permission before the ghost can listen.';
		case 'NotFoundError':
			return 'Microphone not found — is it plugged in?';
		case 'NotReadableError':
			return 'Your mic is busy in another app — close it and try again.';
		case 'OverconstrainedError':
			return "Your mic didn't like those settings — try once more.";
		case 'AbortError':
			return 'The mic request got interrupted — try again.';
		default:
			return isPermissionError(error)
				? 'The mic needs permission before the ghost can listen.'
				: 'Recording needs one more try.';
	}
}
