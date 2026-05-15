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
});
