import { describe, expect, it } from 'vitest';
import { getVaultHash } from './syncService.js';

describe('Vault sync helpers', () => {
	it('uses a stable case-insensitive supporter-code hash', async () => {
		await expect(getVaultHash(' tt-abcd-1234 ')).resolves.toBe(await getVaultHash('TT-ABCD-1234'));
	});
});
