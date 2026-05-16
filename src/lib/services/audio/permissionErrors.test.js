import { describe, expect, it } from 'vitest';
import { isPermissionError } from './permissionErrors.js';

describe('isPermissionError', () => {
	it('matches common browser microphone denial errors', () => {
		expect(isPermissionError(new DOMException('Permission denied', 'NotAllowedError'))).toBe(true);
		expect(isPermissionError({ name: 'SecurityError', message: 'Blocked by browser policy' })).toBe(
			true
		);
		expect(isPermissionError({ message: 'The request is not allowed by the user agent' })).toBe(
			true
		);
		expect(isPermissionError('Permission denied')).toBe(true);
	});

	it('does not treat generic recorder failures as permission errors', () => {
		expect(isPermissionError(new Error('MediaRecorder failed to start'))).toBe(false);
		expect(isPermissionError(null)).toBe(false);
	});
});
