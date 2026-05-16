import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	initializeServices,
	resetServiceInitializationForTesting,
	transcriptionActions,
	transcriptionText
} from './index.js';

describe('initializeServices', () => {
	beforeEach(() => {
		resetServiceInitializationForTesting();
	});

	it('does not reset global stores after the first initialization', () => {
		initializeServices({ reset: true });
		transcriptionActions.updateText('keep this transcript');

		initializeServices();

		expect(get(transcriptionText)).toBe('keep this transcript');
	});

	it('still allows an explicit reset when requested', () => {
		initializeServices({ reset: true });
		transcriptionActions.updateText('discard this transcript');

		initializeServices({ reset: true });

		expect(get(transcriptionText)).toBe('');
	});
});
