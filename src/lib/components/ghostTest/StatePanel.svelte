<script>
	// Props - all state comes from parent
	export let currentTheme = 'peach';
	export let currentAnimation = 'none';
	export let eyePosition = 'center';
	export let isBlinking = false;
	export let ambientBlinking = true;
	export let isRecording = false;
	export let isProcessing = false;
	export let doingSpecialAnimation = false;
</script>

<div class="state-panel">
	<h2>Current State</h2>
	<div class="state-display">
		<div class="state-grid">
			<div>
				<p><strong>Theme:</strong> {currentTheme}</p>
				<p><strong>Animation:</strong> {currentAnimation}</p>
				<p><strong>Eye Position:</strong> {eyePosition}</p>
				<p><strong>Blinking:</strong> {isBlinking ? 'Yes' : 'No'}</p>
			</div>
			<div>
				<p><strong>Ambient Blinking:</strong> {ambientBlinking ? 'Enabled' : 'Disabled'}</p>
				<p><strong>Recording:</strong> {isRecording ? 'Yes' : 'No'}</p>
				<p><strong>Processing:</strong> {isProcessing ? 'Yes' : 'No'}</p>
				<p><strong>Special Animation:</strong> {doingSpecialAnimation ? 'Yes' : 'No'}</p>
			</div>
		</div>
	</div>
</div>

<style>
	.state-panel {
		flex: 1;
		background: #f9f9f9;
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
	}

	.state-panel h2 {
		margin-bottom: 1rem;
		color: #444;
		text-align: center;
		border-bottom: 1px solid #eee;
		padding-bottom: 0.5rem;
	}

	.state-display {
		background: #fff;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.state-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.state-display p {
		margin: 0.25rem 0;
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.state-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
