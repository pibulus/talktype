import { describe, expect, it } from 'vitest';
import { generateMemberIdentity } from './identityUtils.js';

describe('membership identity generation', () => {
	it('generates a stable local identity without remote avatar URLs', () => {
		const hash = 'abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcd';

		expect(generateMemberIdentity(hash)).toEqual(generateMemberIdentity(hash));
		expect(generateMemberIdentity(hash)).toMatchObject({
			memberId: 'TT-ABCD-EF12'
		});
		expect(generateMemberIdentity(hash).avatarUrl).toBeUndefined();
	});

	it('handles an empty vault hash without throwing', () => {
		expect(() => generateMemberIdentity('')).not.toThrow();
		expect(generateMemberIdentity('').memberId).toBe('TT-0000-0000');
	});
});
