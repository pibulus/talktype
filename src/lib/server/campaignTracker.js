/**
 * Launch Campaign Tracker - Modular component for time-limited promotions
 *
 * This is designed to be portable across multiple apps!
 * Just copy this file and adjust the config.
 *
 * Uses abstract storage adapter (FS in dev, Memory in prod)
 */

import { storage } from './storage/index.js';

const STORAGE_KEY = 'campaign-stats';

/**
 * Campaign Configuration
 * Copy this to new apps and adjust!
 */
export const CAMPAIGN_CONFIG = {
	name: 'Launch Special',
	limit: 100,
	startDate: '2025-01-15', // When campaign started
	endDate: null, // null = runs until limit reached

	// Optional: Force end campaign
	forceEnded: false,

	// Display settings
	showCountdown: true,
	urgencyThreshold: 10 // Show urgency when this many spots left
};

/**
 * Get or initialize campaign data
 */
async function getCampaignData() {
	const data = await storage.get(STORAGE_KEY);
	if (!data) {
		return {
			totalSales: 0,
			campaignSales: 0,
			lastUpdated: new Date().toISOString(),
			salesHistory: []
		};
	}
	return data;
}

/**
 * Save campaign data
 */
async function saveCampaignData(data) {
	return await storage.set(STORAGE_KEY, data);
}

/**
 * Record a sale (call this when payment succeeds)
 */
export async function recordCampaignSale(metadata = {}) {
	const data = await getCampaignData();

	// Increment counters
	data.totalSales++;

	// Only count towards campaign if under limit
	if (data.campaignSales < CAMPAIGN_CONFIG.limit && !CAMPAIGN_CONFIG.forceEnded) {
		data.campaignSales++;
	}

	// Add to history
	data.salesHistory.push({
		timestamp: new Date().toISOString(),
		...metadata
	});

	data.lastUpdated = new Date().toISOString();

	await saveCampaignData(data);

	return {
		campaignSale: data.campaignSales <= CAMPAIGN_CONFIG.limit,
		remaining: Math.max(0, CAMPAIGN_CONFIG.limit - data.campaignSales)
	};
}

/**
 * Get campaign status (call from API endpoint)
 * This is what the frontend requests
 */
export async function getCampaignStatus() {
	const data = await getCampaignData();
	const remaining = Math.max(0, CAMPAIGN_CONFIG.limit - data.campaignSales);
	const isActive = remaining > 0 && !CAMPAIGN_CONFIG.forceEnded;

	return {
		isActive,
		remaining,
		total: CAMPAIGN_CONFIG.limit,
		sold: data.campaignSales,
		percentage: Math.round((data.campaignSales / CAMPAIGN_CONFIG.limit) * 100),
		showUrgency: remaining <= CAMPAIGN_CONFIG.urgencyThreshold,
		config: {
			name: CAMPAIGN_CONFIG.name,
			showCountdown: CAMPAIGN_CONFIG.showCountdown
		}
	};
}

/**
 * Manually end campaign (call this to disable launch special)
 */
export async function endCampaign() {
	CAMPAIGN_CONFIG.forceEnded = true;
	const data = await getCampaignData();
	data.campaignEnded = new Date().toISOString();
	await saveCampaignData(data);
	console.log('📊 Campaign manually ended');
}

/**
 * Reset campaign (for testing)
 */
export async function resetCampaign() {
	const data = {
		totalSales: 0,
		campaignSales: 0,
		lastUpdated: new Date().toISOString(),
		salesHistory: []
	};
	await saveCampaignData(data);
	console.log('🔄 Campaign reset');
}
