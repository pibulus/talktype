/**
 * Validate Unlock Code API Endpoint
 * Allows users to unlock premium on additional devices using their code
 */

import { json } from '@sveltejs/kit';
import { validateUnlockCode } from '$lib/server/unlockCodeStore';

/**
 * POST /api/validate-unlock-code
 * Validate an unlock code and return success status
 */
export async function POST({ request }) {
	try {
		const { code } = await request.json();

		// Validate input
		if (!code || typeof code !== 'string') {
			return json({ success: false, error: 'Invalid unlock code format' }, { status: 400 });
		}

		// Validate the code
		const result = await validateUnlockCode(code);

		if (result.valid) {
			return json({
				success: true,
				message: 'Premium unlocked successfully!',
				unlockDate: result.metadata.createdAt
			});
		} else {
			return json(
				{
					success: false,
					error: 'Invalid unlock code. Please check and try again.'
				},
				{ status: 404 }
			);
		}
	} catch (error) {
		console.error('Validate unlock code error:', error);
		return json(
			{
				success: false,
				error: 'Failed to validate unlock code'
			},
			{ status: 500 }
		);
	}
}
