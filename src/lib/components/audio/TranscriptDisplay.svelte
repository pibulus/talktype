<script>
	import { ANIMATION } from '$lib/constants';
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';

	// Props
	export let transcript = '';
	export let showCopyTooltip = false;
	export let responsiveFontSize = 'text-base';
	export let editable = true;

	// Refs
	let editableTranscript;
	let transcriptBoxRef;

	// State
	let tooltipHoverCount = 0;
	let hasUsedCopyButton = false;
	let isScrollable = false;
	let previousTranscript = '';

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Get the current editable content
	export function getEditedTranscript() {
		return editable && editableTranscript ? editableTranscript.innerText : transcript;
	}

	function handleTooltipMouseEnter() {
		if (
			typeof window !== 'undefined' &&
			window.innerWidth >= 640 &&
			!hasUsedCopyButton &&
			tooltipHoverCount < ANIMATION.COPY.TOOLTIP_MAX_COUNT
		) {
			showCopyTooltip = true;
			tooltipHoverCount++;
		}
	}

	function handleCopyClick() {
		hasUsedCopyButton = true;
		showCopyTooltip = false;
		dispatch('copy', { text: getEditedTranscript() });
	}

	// Check if content is scrollable and update UI accordingly
	// Debounced to avoid excessive calls during resize
	let checkScrollableFrame;
	function checkScrollable() {
		if (transcriptBoxRef) {
			// Debounce rapid calls
			if (checkScrollableFrame) {
				cancelAnimationFrame(checkScrollableFrame);
			}

			// Wait a tick for the element to fully render
			checkScrollableFrame = requestAnimationFrame(() => {
				const scrollHeight = transcriptBoxRef.scrollHeight;
				const clientHeight = transcriptBoxRef.clientHeight;
				const hasOverflow = scrollHeight > clientHeight + 20; // Add buffer for more reliable detection
				isScrollable = hasOverflow;
				checkScrollableFrame = null;
			});
		}
	}

	function scrollLiveTranscriptToBottom() {
		if (!transcriptBoxRef || editable) return;

		requestAnimationFrame(() => {
			if (!transcriptBoxRef) return;
			transcriptBoxRef.scrollTop = transcriptBoxRef.scrollHeight;
		});
	}

	// Safely update transcript content without breaking cursor position.
	// During live streaming the box is read-only, so incoming text always wins.
	$: if (editableTranscript && (!editable || document.activeElement !== editableTranscript)) {
		editableTranscript.innerText = transcript;
		checkScrollable();
		if (!editable && transcript !== previousTranscript) {
			scrollLiveTranscriptToBottom();
		}
		previousTranscript = transcript;
	}

	onMount(() => {
		let mounted = true;
		let resizeObserver;

		tick().then(() => {
			if (!mounted) return;

			// Ensure text is set after DOM is ready - handles cases where the
			// reactive $: statement misses the initial bind:this timing.
			if (editableTranscript && transcript) {
				editableTranscript.innerText = transcript;
			}

			checkScrollable();

			if (typeof ResizeObserver === 'undefined') return;

			resizeObserver = new ResizeObserver(() => {
				checkScrollable();
			});

			if (transcriptBoxRef) {
				resizeObserver.observe(transcriptBoxRef);
			}
		});

		return () => {
			mounted = false;
			if (checkScrollableFrame) {
				cancelAnimationFrame(checkScrollableFrame);
				checkScrollableFrame = null;
			}
			resizeObserver?.disconnect();
		};
	});
</script>

<div
	class="transcript-wrapper w-full animate-fadeIn"
	class:live-transcript={!editable}
	on:animationend={() => {
		// No page scrolling needed anymore with fixed layout
		checkScrollable();
	}}
>
	<div class="wrapper-container flex w-full justify-center">
		<div class="transcript-box-container relative mx-auto w-[96%] max-w-[580px] px-0 sm:w-full">
			<!-- Copy button with themed ghost icon -->
			<button
				class="copy-btn share-chip absolute -top-5 right-0 z-[200] h-11 w-11 rounded-full bg-gradient-to-r from-pink-100 to-purple-50 p-1.5 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 active:scale-95 sm:-right-4 sm:-top-4 sm:h-10 sm:w-10"
				on:click|preventDefault={handleCopyClick}
				on:mouseenter={handleTooltipMouseEnter}
				on:mouseleave={() => {
					showCopyTooltip = false;
				}}
				aria-label="Copy transcript to clipboard"
			>
				<!-- Ghost icon using the app's current theme -->
				<div class="h-full w-full p-0.5">
					<DisplayGhost theme={$theme} size="100%" disableJsAnimation={true} />
				</div>

				<!-- Smart tooltip - only shows for first few hovers -->
				{#if showCopyTooltip}
					<div
						class="copy-tooltip absolute -right-2 top-12 z-[250] whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-medium text-purple-800 shadow-md sm:right-0 sm:top-12"
					>
						Copy to clipboard
						<div
							class="tooltip-arrow absolute -top-1.5 right-6 h-3 w-3 rotate-45 bg-white sm:right-4"
						></div>
					</div>
				{/if}
			</button>

			<!-- Redesigned transcript box with proper structure -->
			<div
				class="transcript-box animate-shadow-appear relative mx-auto my-4 box-border
               rounded-[2rem] border-[1.5px] border-pink-100/70 bg-white/95
               shadow-xl transition-all duration-300 contain-layout"
			>
				<!-- Content Area - scrollable -->
				<div
					class="transcript-content-area z-5 relative max-h-[52vh] w-full overflow-y-auto px-4 pb-8 pt-7 sm:max-h-[320px] sm:px-10 sm:pb-10 sm:pt-7"
					bind:this={transcriptBoxRef}
				>
					<div
						class={`transcript-text ${responsiveFontSize} custom-transcript-text animate-text-appear mb-3 break-words text-left font-mono`}
						contenteditable={editable ? 'true' : 'false'}
						role="textbox"
						aria-label={editable ? 'Transcript editor' : 'Live transcript'}
						aria-multiline="true"
						aria-readonly={!editable}
						tabindex="0"
						aria-describedby="transcript-instructions"
						bind:this={editableTranscript}
						on:focus={() => {
							if (editable) {
								dispatch('focus', {
									message: 'You can edit this transcript. Use keyboard to make changes.'
								});
							}
						}}
						on:blur={() => {
							if (editable) {
								dispatch('edit', { text: getEditedTranscript() });
							}
							checkScrollable();
						}}
					>
						<!-- Content set via innerText in reactive statement to avoid cursor jumping -->
					</div>

					<!-- Hidden instructions for screen readers -->
					<div id="transcript-instructions" class="sr-only">
						{editable
							? 'Editable transcript. You can modify the text if needed.'
							: 'Live transcript updates while recording.'}
					</div>
				</div>

				<!-- Footer area with scroll indicator -->
				<div class="transcript-footer-area relative w-full">
					<!-- Scroll indicator - only visible when scrollable -->
					{#if isScrollable}
						<div
							class="scroll-indicator-bottom pointer-events-none absolute left-0 right-0 top-[-32px] z-10"
						></div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Container layout */
	.transcript-wrapper {
		contain: layout;
		margin-top: 24px; /* Reduced space between button and transcript */
	}

	/* Box structure */
	.transcript-box {
		display: flex;
		flex-direction: column;
		overflow: hidden; /* Contain all scrolling internally */
		transition:
			transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
			background-color 0.28s cubic-bezier(0.22, 1, 0.36, 1),
			border-color 0.28s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.38s cubic-bezier(0.22, 1, 0.36, 1);
		animation: subtle-breathe 4s infinite ease-in-out alternate;
		position: relative; /* For the pseudo-element highlight */
		will-change: box-shadow; /* GPU hint for better performance */
	}

	/* Extremely subtle mouseover highlight effect */
	.transcript-box::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 2rem;
		background: radial-gradient(circle at 50% 50%, rgba(249, 168, 212, 0.04), transparent 70%);
		opacity: 0;
		transition: opacity 0.6s ease-in-out;
		pointer-events: none; /* Allow clicks to pass through */
		z-index: 1;
	}

	.transcript-box:hover::before {
		opacity: 1;
	}

	/* Subtle breathing animation - 80/20 rule applied for subtlety */
	@keyframes subtle-breathe {
		0% {
			box-shadow: 0 8px 28px rgba(249, 168, 212, 0.2);
			border-color: rgba(252, 231, 243, 0.7);
		}
		50% {
			box-shadow: 0 9px 29px rgba(249, 168, 212, 0.23);
			border-color: rgba(252, 231, 243, 0.75);
		}
		100% {
			box-shadow: 0 10px 30px rgba(249, 168, 212, 0.25);
			border-color: rgba(252, 231, 243, 0.8);
		}
	}

	/* Elegant hover effect - extremely subtle */
	.transcript-box:hover {
		box-shadow: 0 10px 30px rgba(249, 168, 212, 0.28);
		border-color: rgba(249, 168, 212, 0.4);
		transform: translateY(-0.5px) scale(1.001);
	}

	/* Enhanced transcript text styling - dynamic sizing based on content */
	.custom-transcript-text {
		text-align: left;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		transition:
			background-color 0.4s ease,
			font-size 0.5s ease-out,
			text-shadow 0.3s ease;
		line-height: 1.6; /* Consistent comfortable line height */
		caret-color: rgba(236, 72, 153, 1); /* Darker, more visible cursor color */
		/* Remove explicit font-size to allow Tailwind classes to work */
		/* Base text size now handled by responsiveFontSize classes */
		word-break: break-word;
		font-size: clamp(1rem, 1.1rem + 0.25vw, 1.2rem);
	}

	/* Optimize spacing based on font size for better readability */
	.text-xs,
	.text-sm {
		letter-spacing: 0;
	}

	.text-base,
	.text-lg {
		letter-spacing: 0; /* Normal tracking for medium text */
	}

	.text-xl,
	.text-2xl,
	.text-3xl,
	.text-4xl {
		line-height: 1.5; /* Slightly tighter for larger text */
		letter-spacing: 0;
	}

	/* Clean highlight when clicked/editing - single consistent background */
	.transcript-box:focus-within {
		background-color: rgba(253, 242, 248, 0.9);
		border-color: rgba(249, 168, 212, 0.65);
		box-shadow:
			0 10px 28px rgba(249, 168, 212, 0.3),
			0 0 2px rgba(249, 168, 212, 0.2) inset;
		transform: translateY(-1px) scale(1.003);
		animation: edit-pulse 0.6s cubic-bezier(0.4, 0, 0.2, 1) 1;
	}

	/* Refined text shadow effect when editing - with subtle depth */
	.transcript-box:focus-within .custom-transcript-text {
		text-shadow:
			0 0.5px 0 rgba(249, 168, 212, 0.2),
			0 1px 1.5px rgba(0, 0, 0, 0.03);
		letter-spacing: 0;
	}

	/* Subtle pulse animation when first entering edit mode */
	@keyframes edit-pulse {
		0% {
			background-color: rgba(253, 242, 248, 0.9);
		}
		30% {
			background-color: rgba(249, 168, 212, 0.3);
		}
		100% {
			background-color: rgba(253, 242, 248, 0.9);
		}
	}

	/* Remove outline focus from the text itself for cleaner look */
	.custom-transcript-text:focus {
		outline: none;
	}

	/* Content area scrolling - more refined */
	.transcript-content-area {
		scrollbar-width: thin;
		scrollbar-color: rgba(249, 168, 212, 0.5) transparent;
		overscroll-behavior: contain; /* More controlled overscroll */
		-webkit-overflow-scrolling: touch; /* Smoother scrolling on iOS */
		scroll-behavior: smooth; /* Smoother scrolling */
		transition: all 0.3s ease-out; /* Smooth transitions */
	}

	/* Elegant text selection styling - flat color for better consistency */
	.transcript-box ::selection {
		background-color: rgba(236, 72, 153, 0.25); /* Consistent with cursor color */
		color: #111827;
		text-shadow: none; /* Remove text shadow for cleaner selection */
	}

	/* Custom scrollbar styles for WebKit browsers */
	.transcript-content-area::-webkit-scrollbar {
		width: 6px;
	}

	.transcript-content-area::-webkit-scrollbar-track {
		background: transparent;
	}

	.transcript-content-area::-webkit-scrollbar-thumb {
		background-color: rgba(249, 168, 212, 0.5);
		border-radius: 20px;
		border: 2px solid transparent;
	}

	/* Elegant scroll indicator for content overflow */
	.scroll-indicator-bottom {
		height: 40px; /* Taller gradient for more presence */
		background: linear-gradient(
			to top,
			rgba(255, 255, 255, 0.98) 0%,
			rgba(253, 242, 248, 0.9) 15%,
			rgba(253, 242, 248, 0.5) 40%,
			rgba(253, 242, 248, 0.1) 75%,
			rgba(255, 255, 255, 0) 100%
		);
		box-shadow: 0 -6px 12px -6px rgba(249, 168, 212, 0.15);
		border-bottom-left-radius: 2rem;
		border-bottom-right-radius: 2rem;
		pointer-events: none; /* Ensures text behind it is selectable */
		opacity: 0.95; /* Slight transparency */
	}

	/* Mobile optimization */
	@media (max-width: 600px) {
		.transcript-box-container {
			padding-top: 0.35rem;
		}

		.transcript-content-area {
			max-height: min(46vh, 340px);
			padding: 1.25rem 1rem 1.5rem;
			scrollbar-width: none; /* Hide scrollbar on Firefox */
		}

		.custom-transcript-text {
			font-size: clamp(1rem, 4.2vw, 1.25rem);
			line-height: 1.72;
		}

		.copy-btn {
			right: 0.35rem;
			top: -1.1rem;
		}

		.transcript-content-area::-webkit-scrollbar {
			display: none; /* Hide scrollbar on Webkit browsers */
		}

		.transcript-wrapper {
			margin-top: 24px; /* Smaller gap on mobile */
		}

		.live-transcript {
			margin-top: 0.5rem;
		}

		.live-transcript .transcript-content-area {
			max-height: min(22vh, 190px);
			padding: 1rem 1rem 1.25rem;
		}

		.live-transcript .custom-transcript-text {
			font-size: clamp(0.95rem, 3.5vw, 1.08rem);
			line-height: 1.58;
		}

		/* Slightly taller scroll indicator on mobile */
		.scroll-indicator-bottom {
			height: 48px;
		}
	}

	/* Footer area with gradient and button */
	.transcript-footer-area {
		flex-shrink: 0; /* Prevent footer from shrinking */
		position: relative; /* For positioning the gradient */
		z-index: 5; /* Ensure it's above the content but below the gradient */
		margin-top: -4px; /* Reduce gap between transcript and share button */
	}

	/* Animation classes */
	.animate-shadow-appear {
		box-shadow: 0 8px 30px rgba(249, 168, 212, 0.25);
		animation: shadowAppear 0.5s ease-out forwards;
	}

	.animate-text-appear {
		animation: textAppear 0.4s ease-out forwards;
	}

	@keyframes shadowAppear {
		from {
			box-shadow: 0 0 0 rgba(249, 168, 212, 0);
		}
		to {
			box-shadow: 0 8px 30px rgba(249, 168, 212, 0.25);
		}
	}

	@keyframes textAppear {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
