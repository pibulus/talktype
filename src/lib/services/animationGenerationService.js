// Animation generation service - uses server-side API
export const animationGenerationService = {
	async generateAnimation(description) {
		try {
			console.log('🎭 Generating animation...');

			// Call server-side API endpoint
			const response = await fetch('/api/generate-animation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ description })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Couldn't generate that animation");
			}

			console.log('✅ Animation generated successfully');
			return result.animation;

		} catch (error) {
			console.error('Animation generation error:', error);
			
			// Re-throw with friendly message
			if (error.message.includes('fetch')) {
				throw new Error("Can't reach the animation service. Check your connection?");
			}
			
			throw error;
		}
	}
};