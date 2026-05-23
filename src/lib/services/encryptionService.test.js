import { describe, expect, it } from 'vitest';
import { encrypt, decrypt } from './encryptionService.js';

describe('Encryption Service', () => {
	it('should encrypt and decrypt a JSON object successfully', async () => {
		const testData = { history: ['hello', 'world'], count: 2 };
		const secretCode = 'super-secret-supporter-code-123';

		const encrypted = await encrypt(testData, secretCode);
		const decrypted = await decrypt(encrypted, secretCode);

		expect(decrypted).toEqual(testData);
	});

	it('should fail decryption with the wrong code', async () => {
		const testData = { history: ['hello', 'world'] };
		const encrypted = await encrypt(testData, 'correct-code');

		await expect(decrypt(encrypted, 'wrong-code')).rejects.toThrow();
	});

	it('handles larger history blobs without spreading the whole payload onto the stack', async () => {
		const testData = {
			history: Array.from({ length: 5000 }, (_, index) => `Transcript line ${index}`)
		};
		const secretCode = 'super-secret-supporter-code-123';

		const encrypted = await encrypt(testData, secretCode);
		const decrypted = await decrypt(encrypted, secretCode);

		expect(decrypted).toEqual(testData);
	});
});
