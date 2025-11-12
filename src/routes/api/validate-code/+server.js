/**
 * Validate Unlock Code API Endpoint
 * Checks if an unlock code is valid
 */

import { json } from '@sveltejs/kit';
import { validateUnlockCode } from '$lib/server/unlockCodeStore';

/**
 * POST /api/validate-code
 * Validate an unlock code
 */
export async function POST({ request }) {
	try {
		const { code } = await request.json();

		// Validate input
		if (!code || typeof code !== 'string') {
			return json({ valid: false, error: 'Invalid code format' }, { status: 400 });
		}

		// Check if code is valid
		const result = validateUnlockCode(code);

		if (result.valid) {
			return json({
				valid: true,
				unlockDate: result.metadata.createdAt,
				message: 'Code validated successfully'
			});
		}

		return json({
			valid: false,
			error: 'Invalid or expired code'
		});
	} catch (error) {
		console.error('Validate code error:', error);
		return json(
			{
				valid: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
}
