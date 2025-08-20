<script>
	import { createEventDispatcher } from 'svelte';
	import { animationGenerationService } from '$lib/services/animationGenerationService';

	// Props
	export let customAnimations = [];
	export let currentAnimation = 'none';

	// Local state
	let animationDescription = '';
	let isGeneratingAnimation = false;
	let animationError = '';
	let currentRemoveAnimation = null;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Generate AI animation based on user description
	async function generateAnimation() {
		if (!animationDescription.trim()) {
			animationError = 'Please enter an animation description';
			return;
		}

		animationError = '';
		isGeneratingAnimation = true;

		try {
			const animationData = await animationGenerationService.generateAnimation(
				animationDescription.trim()
			);

			// Emit the new animation data to parent
			dispatch('addCustomAnimation', { animation: animationData });

			// Clear the input field after successful generation
			animationDescription = '';

			// Reset any error
			animationError = '';
		} catch (error) {
			console.error('Error generating animation:', error);
			animationError = 'Failed to generate animation. Please try again.';
		} finally {
			isGeneratingAnimation = false;
		}
	}

	// Apply a custom animation
	function applyCustomAnimation(animation) {
		dispatch('applyCustomAnimation', { animation });
	}
</script>

<div class="control-section ai-animation-generator">
	<h2>Generate Custom Animation</h2>
	<div class="input-container">
		<textarea
			bind:value={animationDescription}
			placeholder="Describe the animation you want in natural language (e.g., 'make the ghost bounce up and down 3 times')"
			rows="3"
			disabled={isGeneratingAnimation}
		></textarea>
		<button
			on:click={generateAnimation}
			disabled={isGeneratingAnimation || !animationDescription.trim()}
			class="generate-button"
		>
			{isGeneratingAnimation ? 'Generating...' : 'Generate Animation'}
		</button>
		{#if animationError}
			<p class="error-message">{animationError}</p>
		{/if}
	</div>

	<!-- Custom Animations List -->
	{#if customAnimations.length > 0}
		<div class="custom-animations">
			<h3>Custom Animations</h3>
			<div class="animation-list">
				{#each customAnimations as animation}
					<button
						class="animation-button {currentAnimation === animation.name ? 'active' : ''}"
						on:click={() => applyCustomAnimation(animation)}
					>
						{animation.name}
						<span class="animation-target">({animation.target})</span>
						<span class="animation-desc">{animation.description}</span>
					</button>
				{/each}
			</div>

			<!-- Code Display Section -->
			{#if currentAnimation !== 'none' && customAnimations.find((a) => a.name === currentAnimation)}
				{@const activeAnimation = customAnimations.find((a) => a.name === currentAnimation)}
				<div class="animation-code-display">
					<h4>Animation CSS Code</h4>
					<div class="code-container">
						<pre><code
								>{`.${activeAnimation.name} {
    animation: ${activeAnimation.name}-keyframes ${activeAnimation.duration}s ${activeAnimation.timing}
  ${activeAnimation.iteration};
  }

  @keyframes ${activeAnimation.name}-keyframes {
    ${activeAnimation.keyframes}
  }`}</code
							></pre>
						<button
							class="copy-button"
							on:click={() => {
								navigator.clipboard.writeText(`.${activeAnimation.name} {
  animation: ${activeAnimation.name}-keyframes ${activeAnimation.duration}s ${activeAnimation.timing} ${activeAnimation.iteration};
}

@keyframes ${activeAnimation.name}-keyframes {
  ${activeAnimation.keyframes}
}`);
							}}
						>
							Copy
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.ai-animation-generator {
		grid-column: span 2;
		background: #f5f5f5;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.input-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		font-family: inherit;
		resize: vertical;
		min-height: 80px;
	}

	.generate-button {
		align-self: flex-end;
		background: #4f46e5;
		color: white;
		font-weight: 500;
		padding: 0.6rem 1.2rem;
	}

	.generate-button:disabled {
		background: #a5a5a5;
		cursor: not-allowed;
	}

	.error-message {
		color: #e53e3e;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	.custom-animations {
		margin-top: 1rem;
	}

	.custom-animations h3 {
		font-size: 1rem;
		margin-bottom: 0.75rem;
		color: #444;
	}

	.animation-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		max-height: 150px;
		overflow-y: auto;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.7);
		border-radius: 0.5rem;
	}

	.animation-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0.75rem;
		font-size: 0.85rem;
		background: white;
		border: 1px solid #ddd;
		flex: 1 0 calc(33% - 0.5rem);
		min-width: 120px;
		max-width: 180px;
		text-align: center;
	}

	.animation-button.active {
		background: #4f46e5;
		color: white;
		border-color: #4338ca;
	}

	.animation-target {
		font-size: 0.7rem;
		opacity: 0.7;
		margin-top: 0.2rem;
	}

	.animation-desc {
		font-size: 0.7rem;
		margin-top: 0.3rem;
		opacity: 0.8;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.animation-code-display {
		margin-top: 1rem;
		background: #f8f8f8;
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid #e0e0e0;
	}

	.animation-code-display h4 {
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
		color: #333;
	}

	.code-container {
		position: relative;
		background: #2d2d2d;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-top: 0.5rem;
		overflow: auto;
		max-height: 250px;
	}

	.code-container pre {
		margin: 0;
		font-family: 'Courier New', monospace;
		color: #f8f8f8;
		font-size: 0.85rem;
		white-space: pre-wrap;
	}

	.copy-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		color: #f8f8f8;
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
	}

	.copy-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	@media (max-width: 768px) {
		.ai-animation-generator {
			grid-column: span 1;
		}
	}
</style>
