export function normalizeTranscriptText(value = '') {
	return String(value ?? '')
		.replace(/\r\n?/g, '\n')
		.replace(/\u00a0/g, ' ');
}

export function cleanTranscriptText(value = '') {
	return normalizeTranscriptText(value).trim();
}

export function getTranscriptWordCount(value = '') {
	const text = cleanTranscriptText(value);
	return text ? text.split(/\s+/).length : 0;
}

export function insertPlainTranscriptText(text) {
	const normalizedText = normalizeTranscriptText(text);
	if (!normalizedText || typeof document === 'undefined' || typeof window === 'undefined') {
		return false;
	}

	try {
		if (document.queryCommandSupported?.('insertText')) {
			return document.execCommand('insertText', false, normalizedText);
		}
	} catch {
		// Fall through to the Selection API path.
	}

	const selection = window.getSelection?.();
	if (!selection?.rangeCount) return false;

	const range = selection.getRangeAt(0);
	range.deleteContents();

	const textNode = document.createTextNode(normalizedText);
	range.insertNode(textNode);
	range.setStartAfter(textNode);
	range.setEndAfter(textNode);
	selection.removeAllRanges();
	selection.addRange(range);
	return true;
}

export function insertPlainTranscriptTextIntoControl(control, text) {
	const normalizedText = normalizeTranscriptText(text);
	if (!control || !normalizedText) return null;

	const currentValue = String(control.value ?? '');
	const selectionStart =
		typeof control.selectionStart === 'number' ? control.selectionStart : currentValue.length;
	const selectionEnd =
		typeof control.selectionEnd === 'number' ? control.selectionEnd : selectionStart;
	const nextValue =
		currentValue.slice(0, selectionStart) + normalizedText + currentValue.slice(selectionEnd);
	const cursorPosition = selectionStart + normalizedText.length;

	control.value = nextValue;
	control.setSelectionRange?.(cursorPosition, cursorPosition);
	return nextValue;
}
