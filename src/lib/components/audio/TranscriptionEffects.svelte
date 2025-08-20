<!--
  TranscriptionEffects component - handles confetti and success animations
  Focused responsibility: celebratory effects and visual feedback
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { confettiService } from '$lib/services/effects/confettiService';
	import { transcriptionService } from '$lib/services';
	import { transcriptionCompletedEvent } from '$lib/services';

	// Props
	export let ghostComponent = null;
	export let targetSelector = '.ghost-icon-wrapper';

	// Local state
	let showConfetti = false;
	let ConfettiComponent = null;
	let confettiColors = [];
	let unsubscribers = [];

	onMount(() => {
		// Subscribe to transcription completion events
		const transcriptionCompletedUnsub = transcriptionCompletedEvent.subscribe(
			async (completedText) => {
				if (completedText) {
					await handleTranscriptCompletion(completedText);
				}
			}
		);

		unsubscribers.push(transcriptionCompletedUnsub);
	});

	onDestroy(() => {
		// Clean up subscriptions
		unsubscribers.forEach((unsub) => unsub());

		// Clean up confetti service
		confettiService.cleanup();
	});

	async function handleTranscriptCompletion(textToProcess) {
		// Stop ghost thinking animation when transcript is complete
		if (ghostComponent && typeof ghostComponent.stopThinking === 'function') {
			ghostComponent.stopThinking();
		}

		// Automatically copy to clipboard when transcription finishes
		if (textToProcess) {
			// Show confetti celebration as a random Easter egg
			const confettiResult = await confettiService.triggerConfetti(targetSelector, () => {
				showConfetti = false;
			});

			if (confettiResult.shouldShow) {
				ConfettiComponent = confettiResult.component;
				confettiColors = confettiResult.config.colors;
				showConfetti = true;
			}

			// Copy to clipboard with small delay to ensure UI updates
			setTimeout(() => {
				transcriptionService.copyToClipboard(textToProcess);
			}, 100);
		}
	}

	// Export function for manual triggering if needed
	export async function triggerConfetti() {
		const confettiResult = await confettiService.triggerConfetti(targetSelector, () => {
			showConfetti = false;
		});

		if (confettiResult.shouldShow) {
			ConfettiComponent = confettiResult.component;
			confettiColors = confettiResult.config.colors;
			showConfetti = true;
		}
	}
</script>

<!-- Confetti component - display centered to the target when triggered -->
{#if showConfetti && ConfettiComponent}
	<svelte:component
		this={ConfettiComponent}
		{targetSelector}
		colors={confettiColors}
		on:complete={() => (showConfetti = false)}
	/>
{/if}
