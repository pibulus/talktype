<script>
	import { promptStyle, customPrompt } from '$lib';
	import { geminiService } from '$lib/services/geminiService';

	let isCustomMode = false;
	let customPromptText = '';
	let showInput = false;

	// Subscribe to stores
	$: isCustomMode = $promptStyle === 'custom';
	$: if ($customPrompt) customPromptText = $customPrompt;

	function toggleCustomPrompt() {
		showInput = !showInput;
		if (showInput && !isCustomMode) {
			// Switch to custom mode when opening
			$promptStyle = 'custom';
			geminiService.setPromptStyle('custom');
		} else if (!showInput && isCustomMode) {
			// Switch back to standard when closing
			$promptStyle = 'standard';
			geminiService.setPromptStyle('standard');
		}
	}

	function saveCustomPrompt() {
		if (customPromptText.trim()) {
			$customPrompt = customPromptText.trim();
			geminiService.setCustomPrompt(customPromptText.trim());
			// Keep custom mode active
			$promptStyle = 'custom';
			geminiService.setPromptStyle('custom');
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveCustomPrompt();
		}
	}
</script>

<div class="space-y-2">
	<button
		on:click={toggleCustomPrompt}
		class="btn btn-sm w-full {isCustomMode
			? 'border-pink-300 bg-pink-100 text-gray-800 hover:bg-pink-200'
			: 'btn-ghost'} justify-between"
	>
		<span>Custom Prompt</span>
		{#if isCustomMode}
			<span class="badge badge-sm border-pink-300 bg-pink-200 text-gray-700">Active</span>
		{:else}
			<span class="text-xs opacity-60">Advanced</span>
		{/if}
	</button>

	{#if showInput}
		<div class="animate-in slide-in-from-top-2 space-y-2 duration-200">
			<textarea
				bind:value={customPromptText}
				on:keydown={handleKeydown}
				on:blur={saveCustomPrompt}
				placeholder="e.g., Transcribe with timestamps every 30 seconds..."
				class="textarea textarea-bordered w-full text-sm"
				rows="3"
			></textarea>
			<p class="text-xs opacity-60">
				Write your own transcription instructions. Press Enter to save.
			</p>
		</div>
	{/if}
</div>
