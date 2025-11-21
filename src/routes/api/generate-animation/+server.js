import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';
import { guardRequest } from '$lib/server/requestGuard.js';

// Initialize Gemini (server-side only)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Animation generation prompt
const ANIMATION_PROMPT = `Generate a CSS animation for a ghost SVG based on this description: '{{description}}'. Return a JSON object with the following structure:

{
  "name": "unique-animation-name", // A unique, descriptive kebab-case name for the animation
  "target": "whole" or "eyes" or "bg" or "outline", // Which part of the ghost to animate. Default to 'whole' if not specified in the description
  "duration": value in seconds, // Reasonable animation duration (0.5-3s)
  "timing": "ease"/"linear"/"cubic-bezier(x,x,x,x)", // Appropriate timing function
  "iteration": number or "infinite", // How many times to play (usually 1 or infinite)
  "keyframes": [
    {
      "percentage": 0, // Keyframe percentage (0-100)
      "properties": { // CSS properties to animate
        "transform": "...", // Any transform functions
        "opacity": value, // Opacity value if needed
        // Other properties as needed
      }
    },
    // More keyframes as needed
  ],
  "description": "Short description of what this animation does"
}

Critical requirements:
1. Make sure the animation is visually appealing and matches the description
2. Use ONLY transform properties (scale, rotate, translate, etc.) and opacity for animation
3. Avoid properties that would break the SVG (like background-color)
4. Ensure animation starts and ends in a natural state (if not infinite)
5. If the animation should affect only part of the ghost, specify the correct 'target'
6. Ensure all values are valid CSS
7. DO NOT include any explanation or text outside the JSON object
8. VERY IMPORTANT: Return raw JSON only - DO NOT use markdown formatting, code blocks, or backticks (\`\`\`) in your response`;

// Helper to clean markdown from response
function cleanMarkdownResponse(text) {
	// Check if wrapped in markdown code block
	const markdownPattern = /```(?:json)?\s*([\s\S]*?)```/;
	const match = text.match(markdownPattern);

	if (match) {
		return match[1].trim();
	}

	// Try to find JSON object anywhere in text
	const jsonMatch = text.match(/(\{[\s\S]*\})/);
	if (jsonMatch) {
		return jsonMatch[1].trim();
	}

	return text;
}

export async function POST(event) {
	try {
		const guardResponse = guardRequest(event);
		if (guardResponse) {
			return guardResponse;
		}

		const { description } = await event.request.json();

		if (!description) {
			return json(
				{
					error: 'Need a description for the animation - what should the ghost do?'
				},
				{ status: 400 }
			);
		}

		// Generate the prompt with the description
		const prompt = ANIMATION_PROMPT.replace('{{description}}', description);

		// Generate animation
		const result = await model.generateContent(prompt);
		const responseText = result.response.text();

		// Clean any markdown formatting
		const cleanedResponse = cleanMarkdownResponse(responseText);

		// Parse the JSON
		const animationData = JSON.parse(cleanedResponse);

		// Validate the response has required fields
		if (!animationData.name || !animationData.keyframes) {
			throw new Error('Invalid animation data structure');
		}

		return json({ animation: animationData });
	} catch (error) {
		console.error('Animation generation error:', error);

		let friendlyMessage =
			"The ghost's animation spirit got confused. Try describing it differently?";

		if (error.message?.includes('quota')) {
			friendlyMessage = 'Hit our animation limit for today. The ghost needs rest!';
		} else if (error.message?.includes('JSON')) {
			friendlyMessage =
				"Couldn't understand the animation instructions. Try a simpler description?";
		}

		return json(
			{
				error: friendlyMessage
			},
			{ status: 500 }
		);
	}
}
