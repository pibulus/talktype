<script>
	import { createEventDispatcher } from 'svelte';

	// Props
	export let isRecording = false;
	export let isProcessing = false;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Action handlers
	function greetingAnimation() {
		dispatch('action', { type: 'greeting' });
	}

	function pulse() {
		dispatch('action', { type: 'pulse' });
	}

	function doFullAnimationSequence() {
		dispatch('action', { type: 'fullAnimationSequence' });
	}

	function toggleRecording() {
		dispatch('recordingChange', { isRecording: !isRecording });
	}

	function toggleProcessing() {
		dispatch('processingChange', { isProcessing: !isProcessing });
	}
</script>

<div class="control-section quick-actions">
	<h2>Quick Actions</h2>
	<div class="animation-buttons">
		<button on:click={greetingAnimation}>Greeting</button>
		<button on:click={pulse}>Pulse</button>
		<button on:click={doFullAnimationSequence}>Animation Sequence</button>
		<button class:active={isRecording} on:click={toggleRecording}>
			{isRecording ? 'Stop Recording' : 'Record'}
		</button>
		<button class:active={isProcessing} on:click={toggleProcessing}>
			{isProcessing ? 'Stop Processing' : 'Process'}
		</button>
	</div>
</div>

<style>
	.quick-actions {
		grid-column: span 2;
	}

	.quick-actions .animation-buttons {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.5rem;
	}

	.control-section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #ddd;
	}

	.control-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	h2 {
		font-size: 1.2rem;
		margin-bottom: 1rem;
		color: #444;
	}

	.animation-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	button {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		padding: 0.4rem 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.9rem;
	}

	button:hover {
		background: #f0f0f0;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	button.active {
		background: #4f46e5;
		color: white;
		border-color: #4338ca;
	}

	@media (max-width: 768px) {
		.quick-actions {
			grid-column: span 1;
		}
	}
</style>
