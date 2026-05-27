import { describe, expect, it } from 'vitest';
import { resolveTranscriptionMode } from './mode.js';

describe('transcription mode resolution', () => {
	it('uses live Deepgram when live mode is enabled and offline mode is disabled', () => {
		expect(
			resolveTranscriptionMode({ liveModeValue: 'true', privacyModeValue: 'false' })
		).toMatchObject({
			useLiveDeepgram: true,
			useOfflineWhisper: false,
			useBatchCloud: true
		});
	});

	it('uses batch cloud when Live and Offline are both disabled', () => {
		expect(
			resolveTranscriptionMode({ liveModeValue: 'false', privacyModeValue: 'false' })
		).toMatchObject({
			liveModeEnabled: false,
			privacyModeEnabled: false,
			useLiveDeepgram: false,
			useOfflineWhisper: false,
			useBatchCloud: true
		});
	});

	it('lets offline mode override live mode if both flags are present', () => {
		expect(
			resolveTranscriptionMode({ liveModeValue: 'true', privacyModeValue: 'true' })
		).toMatchObject({
			liveModeEnabled: false,
			privacyModeEnabled: true,
			useLiveDeepgram: false,
			useOfflineWhisper: true,
			useBatchCloud: false
		});
	});

	it('accepts boolean settings values as well as stored string values', () => {
		expect(
			resolveTranscriptionMode({ liveModeValue: true, privacyModeValue: false })
		).toMatchObject({
			useLiveDeepgram: true,
			useOfflineWhisper: false,
			useBatchCloud: true
		});
		expect(
			resolveTranscriptionMode({ liveModeValue: false, privacyModeValue: true })
		).toMatchObject({
			useLiveDeepgram: false,
			useOfflineWhisper: true,
			useBatchCloud: false
		});
	});
});
