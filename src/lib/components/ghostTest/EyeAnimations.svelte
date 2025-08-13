<script>
	import { createEventDispatcher } from 'svelte';

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Animation handlers
	function startThinking() {
		dispatch('action', { type: 'startThinking' });
	}

	function stopThinking() {
		dispatch('action', { type: 'stopThinking' });
	}

	function reactShort() {
		dispatch('action', { type: 'reactToTranscript', length: 'short' });
	}

	function reactLong() {
		dispatch('action', { type: 'reactToTranscript', length: 'long' });
	}
</script>

<div class="control-section">
	<h2>Eye Animations</h2>
	<div class="animation-buttons">
		<button on:click={startThinking}>Start Thinking</button>
		<button on:click={stopThinking}>Stop Thinking</button>
		<button on:click={reactShort}>React (Short)</button>
		<button on:click={reactLong}>React (Long)</button>
	</div>
</div>

<style>
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
</style>
