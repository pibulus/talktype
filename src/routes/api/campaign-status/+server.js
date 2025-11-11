/**
 * Campaign Status API Endpoint
 * Returns remaining spots for launch special
 */

import { json } from '@sveltejs/kit';
import { getCampaignStatus } from '$lib/server/campaignTracker';

/**
 * GET /api/campaign-status
 * Returns current campaign status
 */
export async function GET() {
	try {
		const status = getCampaignStatus();
		return json(status);
	} catch (error) {
		console.error('Campaign status error:', error);
		return json(
			{
				isActive: false,
				remaining: 0,
				error: 'Failed to get campaign status'
			},
			{ status: 500 }
		);
	}
}
