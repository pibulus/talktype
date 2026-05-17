import { describe, expect, it } from 'vitest';
import {
	isSupporterCodeValid,
	normalizeSupporterCode,
	parseSupporterCodes
} from './supporterCodes.js';

describe('supporter code helpers', () => {
	it('normalizes pasted codes without caring about case', () => {
		expect(normalizeSupporterCode(' talk-abc-123 ')).toBe('TALK-ABC-123');
	});

	it('parses comma-separated env codes', () => {
		expect(parseSupporterCodes(' talk-one ,TALK-TWO', '', null)).toEqual(['TALK-ONE', 'TALK-TWO']);
	});

	it('matches entered codes case-insensitively', () => {
		const validCodes = parseSupporterCodes('TALK-ABC-123');

		expect(isSupporterCodeValid('talk-abc-123', validCodes)).toBe(true);
		expect(isSupporterCodeValid('TALK-NOPE', validCodes)).toBe(false);
	});
});
