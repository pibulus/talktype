/**
 * Premium Service - Handles premium feature unlocking and validation
 * One-time $9 unlock for lifetime access
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Storage key for premium status
const PREMIUM_STORAGE_KEY = 'talktype_premium_unlocked';
const PREMIUM_UNLOCK_DATE_KEY = 'talktype_premium_unlock_date';

// Premium status store
export const premiumStatus = writable({
	isUnlocked: false,
	unlockDate: null,
	features: {
		extendedRecording: false, // 10 minutes vs 60 seconds
		customThemes: false, // mint, bubblegum, rainbow
		customPrompts: false, // custom transcription instructions
		saveTranscripts: false, // save to history
		viewHistory: false, // view past transcriptions
		batchDownload: false // download all as ZIP
	}
});

// Derived store for quick premium check
export const isPremium = derived(premiumStatus, ($status) => $status.isUnlocked);

/**
 * Initialize premium status from localStorage
 */
export function initializePremiumStatus() {
	if (!browser) return;

	const isUnlocked = localStorage.getItem(PREMIUM_STORAGE_KEY) === 'true';
	const unlockDate = localStorage.getItem(PREMIUM_UNLOCK_DATE_KEY);

	if (isUnlocked) {
		unlockPremiumFeatures(unlockDate);
		console.log('🎉 Premium features active since:', unlockDate);
	}
}

/**
 * Unlock premium features
 * @param {string|null} existingUnlockDate - Optional existing unlock date
 */
export function unlockPremiumFeatures(existingUnlockDate = null) {
	const unlockDate = existingUnlockDate || new Date().toISOString();

	// Update store
	premiumStatus.set({
		isUnlocked: true,
		unlockDate: unlockDate,
		features: {
			extendedRecording: true,
			customThemes: true,
			customPrompts: true,
			saveTranscripts: true,
			viewHistory: true,
			batchDownload: true
		}
	});

	// Persist to localStorage
	if (browser) {
		localStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
		localStorage.setItem(PREMIUM_UNLOCK_DATE_KEY, unlockDate);
	}

	console.log('✨ Premium features unlocked!', unlockDate);
	return true;
}

/**
 * Check if user has a specific premium feature
 * @param {string} feature - Feature name to check
 * @returns {boolean}
 */
export function hasPremiumFeature(feature) {
	const status = get(premiumStatus);
	return status.isUnlocked && status.features[feature] === true;
}

/**
 * Get all available premium features
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getPremiumFeatures() {
	return [
		{
			id: 'extendedRecording',
			name: '10-Minute Recordings',
			description: '10x longer recordings (vs 60 seconds free)',
			icon: '⏱️'
		},
		{
			id: 'customThemes',
			name: 'Premium Ghost Themes',
			description: 'Unlock Mint, Bubblegum & Rainbow themes',
			icon: '🎨'
		},
		{
			id: 'customPrompts',
			name: 'Custom Transcription Styles',
			description: 'Write your own transcription instructions',
			icon: '✍️'
		},
		{
			id: 'saveTranscripts',
			name: 'Save Transcripts + Audio',
			description: 'Store all your transcriptions locally',
			icon: '💾'
		},
		{
			id: 'viewHistory',
			name: 'Transcript History',
			description: 'View and manage all past transcriptions',
			icon: '📚'
		},
		{
			id: 'batchDownload',
			name: 'Batch Download',
			description: 'Export everything as a ZIP file',
			icon: '📦'
		}
	];
}

/**
 * Reset premium status (for testing/debugging)
 */
export function resetPremiumStatus() {
	if (!browser) return;

	localStorage.removeItem(PREMIUM_STORAGE_KEY);
	localStorage.removeItem(PREMIUM_UNLOCK_DATE_KEY);

	premiumStatus.set({
		isUnlocked: false,
		unlockDate: null,
		features: {
			extendedRecording: false,
			customThemes: false,
			customPrompts: false,
			saveTranscripts: false,
			viewHistory: false,
			batchDownload: false
		}
	});

	console.log('🔓 Premium status reset');
}

// Initialize on import
if (browser) {
	initializePremiumStatus();
}
