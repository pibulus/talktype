import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@deepgram/sdk';

export async function GET() {
	const apiKey = env.DEEPGRAM_API_KEY;
	if (!apiKey) {
		return json({ error: 'Server Error: Missing Deepgram API key' }, { status: 500 });
	}

	try {
		const deepgram = createClient(apiKey);

		// 1. Get the project ID (we need it to create a key)
		// We assume the API key belongs to the first project returned
		const { result: projectsResult, error: projectsError } = await deepgram.manage.getProjects();
		
		if (projectsError) {
			console.error('[DeepgramToken] Failed to get projects:', projectsError);
			throw new Error('Failed to get Deepgram projects');
		}

		const projectId = projectsResult?.projects?.[0]?.project_id;

		if (!projectId) {
			throw new Error('No Deepgram project found');
		}

		// 2. Create a temporary key
		// Valid for 10 seconds, just enough to connect
		const { result: newKeyResult, error: newKeyError } = await deepgram.manage.createProjectKey(projectId, {
			comment: 'talktype-streaming-temp',
			scopes: ['usage:write'],
			time_to_live_in_seconds: 10
		});

		if (newKeyError) {
			console.error('[DeepgramToken] Failed to create key:', newKeyError);
			throw new Error('Failed to create temporary key');
		}

		return json({ 
			key: newKeyResult.key,
			projectId: projectId // Optional, but might be useful
		});

	} catch (error) {
		console.error('[DeepgramToken] ❌ Error:', error);
		return json({ error: 'Failed to generate token' }, { status: 500 });
	}
}
