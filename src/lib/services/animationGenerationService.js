import { geminiApiService } from './geminiApiService';
import { promptManager } from './promptManager';

export const animationGenerationService = {
	// Helper function to clean markdown code blocks from response
	_cleanMarkdownResponse(text) {
		// Check if the response is wrapped in a markdown code block (more flexible pattern)
		const markdownPattern = /```(?:json)?\s*([\s\S]*?)```/;
		const match = text.match(markdownPattern);

		if (match) {
			// Extract the content inside the code block
			return match[1].trim();
		}

		// Try to find JSON object anywhere in the text if markdown pattern failed
		const jsonMatch = text.match(/(\{[\s\S]*\})/);
		if (jsonMatch) {
			return jsonMatch[1].trim();
		}

		// If no markdown pattern found, return the original text
		return text;
	},

	async generateAnimation(description) {
		try {
			console.log('🎭 Generating animation with Gemini');

			// Ensure model is preloaded if possible
			const { initialized } = geminiApiService.getModelStatus();
			if (!initialized) {
				try {
					console.log('🔍 Preloading model before animation generation');
					await geminiApiService.preloadModel();
				} catch (err) {
					console.log('⚠️ Preloading failed, continuing with animation generation:', err);
				}
			}

			// Get the animation generation prompt and apply the description
			const prompt = promptManager.getPrompt('generateAnimation', { description });

			// Generate content with the prompt
			const response = await geminiApiService.generateContent(prompt);
			console.log('✅ Animation generation complete');

			try {
				// Get the response text and clean any markdown formatting
				const responseText = response.text();
				console.log('Raw response:', responseText);

				// Clean the response from any markdown formatting
				const cleanedResponse = this._cleanMarkdownResponse(responseText);
				console.log('Cleaned response:', cleanedResponse);

				// Parse the cleaned response as JSON
				const animationData = JSON.parse(cleanedResponse);
				return animationData;
			} catch (parseError) {
				console.error('❌ Error parsing animation data:', parseError);
				throw new Error('Failed to parse animation data from Gemini');
			}
		} catch (error) {
			console.error('❌ Error generating animation:', error);
			throw new Error('Failed to generate animation with Gemini');
		}
	},

	// Generate CSS from animation data
	generateCss(animationData) {
		if (!animationData || !animationData.name || !animationData.keyframes) {
			throw new Error('Invalid animation data');
		}

		// Build keyframes CSS
		const keyframesCSS = `
@keyframes ${animationData.name} {
  ${animationData.keyframes
		.map((keyframe) => {
			return `${keyframe.percentage}% {
    ${Object.entries(keyframe.properties)
			.map(([prop, value]) => `${prop}: ${value};`)
			.join('\n    ')}
  }`;
		})
		.join('\n  ')}
}`;

		// Build animation class CSS
		const animationCSS = `
.${animationData.name} {
  animation: ${animationData.name} ${animationData.duration}s ${animationData.timing} ${animationData.iteration};
}`;

		return {
			keyframesCSS,
			animationCSS,
			fullCSS: keyframesCSS + animationCSS
		};
	},

	// Apply the animation to a specific target in the ghost SVG
	applyAnimation(ghostSvg, animationData) {
		if (!ghostSvg) {
			throw new Error('Ghost SVG element not found');
		}

		// Generate CSS for the animation
		const { keyframesCSS, animationCSS } = this.generateCss(animationData);

		// Create a style element if it doesn't exist
		let styleElement = document.getElementById('ghost-custom-animations');
		if (!styleElement) {
			styleElement = document.createElement('style');
			styleElement.id = 'ghost-custom-animations';
			document.head.appendChild(styleElement);
		}

		// Add the new animation CSS
		styleElement.textContent += `\n${keyframesCSS}\n${animationCSS}`;

		// Determine which element to animate based on the target
		let targetElement;
		switch (animationData.target) {
			case 'eyes':
				targetElement = ghostSvg.querySelector('.ghost-eyes');
				break;
			case 'bg':
				targetElement = ghostSvg.querySelector('.ghost-bg');
				break;
			case 'outline':
				targetElement = ghostSvg.querySelector('.ghost-outline');
				break;
			case 'whole':
			default:
				targetElement = ghostSvg; // Apply to the whole SVG
				break;
		}

		if (!targetElement) {
			throw new Error(`Target element '${animationData.target}' not found in ghost SVG`);
		}

		// Add the animation class to the target element
		targetElement.classList.add(animationData.name);

		// Return a function to remove the animation
		return function removeAnimation() {
			targetElement.classList.remove(animationData.name);
		};
	}
};
