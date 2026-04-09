import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

function getValidCodes() {
	return [env.SUPPORTER_UNLOCK_CODES, env.SUPPORTER_UNLOCK_CODE]
		.filter(Boolean)
		.flatMap((value) => value.split(','))
		.map((code) => code.trim())
		.filter(Boolean);
}

export async function POST({ request }) {
	try {
		const { code } = await request.json();
		const normalizedCode = code?.toString().trim();
		const validCodes = getValidCodes();

		if (!normalizedCode) {
			return json({ valid: false, error: 'Enter a supporter code.' }, { status: 400 });
		}

		if (validCodes.length === 0) {
			return json(
				{ valid: false, error: 'Supporter codes are not configured on this server yet.' },
				{ status: 503 }
			);
		}

		const isValid = validCodes.includes(normalizedCode);

		if (!isValid) {
			return json({ valid: false, error: 'That supporter code did not match.' }, { status: 401 });
		}

		return json({ valid: true });
	} catch (error) {
		console.error('[API /validate-code] Failed to validate supporter code:', error);
		return json(
			{ valid: false, error: 'Could not validate that code right now.' },
			{ status: 500 }
		);
	}
}
