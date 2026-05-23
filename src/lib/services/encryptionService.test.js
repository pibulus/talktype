import { describe, expect, it } from 'vitest';
import { encrypt, decrypt, encryptBlob, decryptBlob } from './encryptionService.js';

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

	it('normalizes supporter code casing for encryption keys', async () => {
		const testData = { history: ['hello passport'] };
		const encrypted = await encrypt(testData, ' tt-abcd-1234 ');

		await expect(decrypt(encrypted, 'TT-ABCD-1234')).resolves.toEqual(testData);
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

	it('encrypts and decrypts audio blobs with authenticated metadata', async () => {
		const audioBlob = new Blob(['small-audio-payload'], { type: 'audio/webm' });
		const secretCode = 'super-secret-supporter-code-123';

		const encrypted = await encryptBlob(audioBlob, secretCode, {
			mediaId: 'clip-1',
			transcriptId: 'transcript-1'
		});
		const { blob, metadata } = await decryptBlob(encrypted, secretCode);

		expect(blob.type).toBe('audio/webm');
		expect(await blob.text()).toBe('small-audio-payload');
		expect(metadata).toMatchObject({
			mediaId: 'clip-1',
			transcriptId: 'transcript-1',
			mimeType: 'audio/webm',
			size: audioBlob.size
		});
		await expect(decryptBlob(encrypted, 'wrong-code')).rejects.toThrow();
	});
});
