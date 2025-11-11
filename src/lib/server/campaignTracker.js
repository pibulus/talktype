/**
 * Launch Campaign Tracker - Modular component for time-limited promotions
 *
 * This is designed to be portable across multiple apps!
 * Just copy this file and adjust the config.
 *
 * No Supabase needed - uses simple JSON storage
 * For real-time updates, swap JSON with Supabase/Firebase later
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src/lib/server/data');
const CAMPAIGN_FILE = path.join(DATA_DIR, 'campaign-stats.json');

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
	urgencyThreshold: 10, // Show urgency when this many spots left
};

/**
 * Get or initialize campaign data
 */
function getCampaignData() {
	try {
		if (!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true });
		}

		if (!fs.existsSync(CAMPAIGN_FILE)) {
			const initialData = {
				totalSales: 0,
				campaignSales: 0,
				lastUpdated: new Date().toISOString(),
				salesHistory: []
			};
			fs.writeFileSync(CAMPAIGN_FILE, JSON.stringify(initialData, null, 2));
			return initialData;
		}

		const data = fs.readFileSync(CAMPAIGN_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error loading campaign data:', error);
		return { totalSales: 0, campaignSales: 0, salesHistory: [] };
	}
}

/**
 * Save campaign data
 */
function saveCampaignData(data) {
	try {
		if (!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true });
		}
		fs.writeFileSync(CAMPAIGN_FILE, JSON.stringify(data, null, 2));
		return true;
	} catch (error) {
		console.error('Error saving campaign data:', error);
		return false;
	}
}

/**
 * Record a sale (call this when payment succeeds)
 */
export function recordCampaignSale(metadata = {}) {
	const data = getCampaignData();

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

	saveCampaignData(data);

	return {
		campaignSale: data.campaignSales <= CAMPAIGN_CONFIG.limit,
		remaining: Math.max(0, CAMPAIGN_CONFIG.limit - data.campaignSales)
	};
}

/**
 * Get campaign status (call from API endpoint)
 * This is what the frontend requests
 */
export function getCampaignStatus() {
	const data = getCampaignData();
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
export function endCampaign() {
	CAMPAIGN_CONFIG.forceEnded = true;
	const data = getCampaignData();
	data.campaignEnded = new Date().toISOString();
	saveCampaignData(data);
	console.log('📊 Campaign manually ended');
}

/**
 * Reset campaign (for testing)
 */
export function resetCampaign() {
	const data = {
		totalSales: 0,
		campaignSales: 0,
		lastUpdated: new Date().toISOString(),
		salesHistory: []
	};
	saveCampaignData(data);
	console.log('🔄 Campaign reset');
}
