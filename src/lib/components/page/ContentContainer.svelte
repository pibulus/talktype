<script>
	import { createEventDispatcher } from 'svelte';
	import AudioToText from '../audio/AudioToText.svelte';
	import AnimatedTitle from './AnimatedTitle.svelte';

	// Props passed from the parent
	export let ghostComponent = null;

	// Event dispatcher to communicate with parent
	const dispatch = createEventDispatcher();

	// Component references
	let audioToTextComponent;

	// Debug helper
	function debug() {
		// Uncomment the line below during development for verbose logging
		// console.log(`[ContentContainer] ${message}`);
	}

	// Function to handle title animation complete
	function handleTitleAnimationComplete() {
		debug('Title animation complete');
		dispatch('titleAnimationComplete');
	}

	// Function to handle subtitle animation complete
	function handleSubtitleAnimationComplete() {
		debug('Subtitle animation complete');
		dispatch('subtitleAnimationComplete');
	}

	// Public methods for parent to access
	export function startRecording(options = {}) {
		if (audioToTextComponent) {
			debug('Starting recording from parent');
			return audioToTextComponent.startRecording(options);
		}
		return false;
	}

	export function stopRecording() {
		if (audioToTextComponent) {
			debug('Stopping recording from parent');
			return audioToTextComponent.stopRecording();
		}
	}

	export function toggleRecording() {
		if (audioToTextComponent) {
			debug('Toggling recording from parent');
			return audioToTextComponent.toggleRecording();
		} else {
			console.error('[ContentContainer] audioToTextComponent is not available!');
		}
	}

	function forwardTranscriptionCompleted(event) {
		dispatch('transcriptionCompleted', event.detail);
	}
</script>

<AnimatedTitle
	on:titleAnimationComplete={handleTitleAnimationComplete}
	on:subtitleAnimationComplete={handleSubtitleAnimationComplete}
/>

<!-- Audio component - Wider container for better transcript layout -->
<div class="w-full max-w-xl sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
	<AudioToText
		bind:this={audioToTextComponent}
		{ghostComponent}
		on:transcriptionCompleted={forwardTranscriptionCompleted}
	/>
</div>
