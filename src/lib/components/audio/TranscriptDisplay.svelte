<script>
	import { ANIMATION } from '$lib/constants';
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { soundService } from '$lib/services/infrastructure/soundService.js';
	import { typewriterSoundService } from '$lib/services/infrastructure/typewriterSoundService.js';
	import { centerElementInViewport } from '$lib/utils/scrollUtils';
	import { insertPlainTranscriptText, normalizeTranscriptText } from '$lib/utils/transcriptText.js';
	import { theme } from '$lib';

	const TYPEWRITER_INPUT_GUARD_MS = 34;

	// Props
	export let transcript = '';
	export let showCopyTooltip = false;
	export let responsiveFontSize = 'text-base';
	export let editable = true;
	export let copyNeedsGesture = false;
	export let autoCenterOnTranscript = true;

	// Refs
	let editableTranscript;
	let transcriptBoxRef;
	let transcriptWrapperRef;

	// State
	let tooltipHoverCount = 0;
	let hasUsedCopyButton = false;
	let isScrollable = false;
	let previousTranscript = '';
	let hasAutoCenteredTranscript = false;
	let transcriptCenterTimeout;
	let transcriptCenterFrame;
	let transcriptCenterResetTimeout;
	let isCenteringTranscript = false;
	let lastTypewriterInputAt = 0;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Get the current editable content
	export function getEditedTranscript() {
		return normalizeTranscriptText(
			editable && editableTranscript ? editableTranscript.innerText : transcript
		);
	}

	function dispatchEditedTranscript() {
		if (!editable) return;
		dispatch('edit', { text: getEditedTranscript() });
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

	function getTypewriterEventTime() {
		return browser && window.performance?.now ? window.performance.now() : Date.now();
	}

	function canPlayTypewriterSound() {
		return browser && editable && soundService.isEnabled();
	}

	function warmTypewriterSounds() {
		if (!canPlayTypewriterSound()) return;
		typewriterSoundService.prime().catch(() => {});
	}

	function handleTranscriptFocus() {
		warmTypewriterSounds();
		if (editable) {
			dispatch('focus', {
				message: 'You can edit this transcript. Use keyboard to make changes.'
			});
		}
	}

	function handleTranscriptBlur() {
		dispatchEditedTranscript();
		checkScrollable();
	}

	function handleTranscriptKeydown(event) {
		if (!canPlayTypewriterSound()) return;
		if (!typewriterSoundService.isEditKeyEvent(event)) return;

		lastTypewriterInputAt = getTypewriterEventTime();
		typewriterSoundService.playFromKeyboardEvent(event).catch(() => {});
	}

	function handleTranscriptBeforeInput(event) {
		if (!canPlayTypewriterSound()) return;

		const now = getTypewriterEventTime();
		if (now - lastTypewriterInputAt < TYPEWRITER_INPUT_GUARD_MS) return;
		if (!typewriterSoundService.isSupportedInputEvent(event)) return;

		lastTypewriterInputAt = now;
		typewriterSoundService.playFromInputEvent(event).catch(() => {});
	}

	function handleTranscriptPaste(event) {
		if (!editable) return;

		const text = event.clipboardData?.getData('text/plain');
		if (typeof text !== 'string') return;

		event.preventDefault();
		insertPlainTranscriptText(text);
		tick().then(() => {
			dispatchEditedTranscript();
			checkScrollable();
		});
	}

	function handleTranscriptInput() {
		dispatchEditedTranscript();
		checkScrollable();
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

	function clearTranscriptCenterTimers() {
		if (transcriptCenterTimeout) {
			clearTimeout(transcriptCenterTimeout);
			transcriptCenterTimeout = null;
		}
		if (transcriptCenterFrame) {
			cancelAnimationFrame(transcriptCenterFrame);
			transcriptCenterFrame = null;
		}
		if (transcriptCenterResetTimeout) {
			clearTimeout(transcriptCenterResetTimeout);
			transcriptCenterResetTimeout = null;
		}
	}

	async function scheduleTranscriptCenter() {
		if (!browser || !autoCenterOnTranscript) return;

		clearTranscriptCenterTimers();
		await tick();

		transcriptCenterTimeout = setTimeout(() => {
			transcriptCenterTimeout = null;
			transcriptCenterFrame = requestAnimationFrame(() => {
				transcriptCenterFrame = null;
				if (!transcriptWrapperRef) return;

				const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
					? 'auto'
					: 'smooth';
				centerElementInViewport(transcriptWrapperRef, { behavior });
				isCenteringTranscript = true;
				transcriptCenterResetTimeout = setTimeout(() => {
					isCenteringTranscript = false;
					transcriptCenterResetTimeout = null;
				}, 850);
			});
		}, 120);
	}

	// Safely update transcript content without breaking cursor position.
	// During live streaming the box is read-only, so incoming text always wins.
	$: if (editableTranscript && (!editable || document.activeElement !== editableTranscript)) {
		editableTranscript.innerText = normalizeTranscriptText(transcript);
		checkScrollable();
		if (!editable && transcript !== previousTranscript) {
			scrollLiveTranscriptToBottom();
		}
		previousTranscript = transcript;
	}

	$: transcriptReadyForCenter = transcript.trim() && transcript.trim() !== 'Listening...';
	$: if (!transcriptReadyForCenter) {
		hasAutoCenteredTranscript = false;
	}
	$: if (transcriptReadyForCenter && !hasAutoCenteredTranscript) {
		hasAutoCenteredTranscript = true;
		scheduleTranscriptCenter();
	}

	onMount(() => {
		let mounted = true;
		let resizeObserver;

		tick().then(() => {
			if (!mounted) return;

			// Ensure text is set after DOM is ready - handles cases where the
			// reactive $: statement misses the initial bind:this timing.
			if (editableTranscript && transcript) {
				editableTranscript.innerText = normalizeTranscriptText(transcript);
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
			clearTranscriptCenterTimers();
			resizeObserver?.disconnect();
		};
	});
</script>

<div
	bind:this={transcriptWrapperRef}
	class="transcript-wrapper w-full animate-fadeIn"
	class:live-transcript={!editable}
	class:final-transcript={editable}
	class:transcript-arrival-focus={isCenteringTranscript}
	on:animationend={() => {
		checkScrollable();
	}}
>
	<div class="wrapper-container flex w-full justify-center">
		<div class="transcript-box-container relative mx-auto w-[96%] max-w-[580px] px-0 sm:w-full">
			<!-- Copy button with themed ghost icon -->
			<button
				class="copy-btn share-chip absolute -top-5 right-0 z-[200] h-12 w-12 rounded-full bg-gradient-to-r from-pink-100 to-purple-50 p-1.5 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 active:scale-95 sm:-right-4 sm:-top-4 sm:h-11 sm:w-11"
				class:copyNeedsGesture
				on:click|preventDefault={handleCopyClick}
				on:mouseenter={handleTooltipMouseEnter}
				on:mouseleave={() => {
					showCopyTooltip = false;
				}}
				aria-label={copyNeedsGesture ? 'Copy this transcript' : 'Copy transcript'}
				title="Copy"
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
						Copy
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
               shadow-xl transition-all duration-300"
			>
				<!-- Content Area - scrollable -->
				<div
					class="transcript-content-area z-5 relative max-h-[52svh] w-full overflow-y-auto px-4 pb-8 pt-7 sm:max-h-[320px] sm:px-10 sm:pb-10 sm:pt-7"
					bind:this={transcriptBoxRef}
				>
					<div
						class={`transcript-text ${responsiveFontSize} custom-transcript-text animate-text-appear mb-3 break-words text-left font-mono`}
						contenteditable={editable ? 'true' : 'false'}
						role="textbox"
						aria-label={editable ? 'Transcript editor' : 'Live transcript'}
						aria-multiline="true"
						aria-readonly={!editable}
						aria-live={editable ? undefined : 'polite'}
						aria-relevant={editable ? undefined : 'text additions'}
						tabindex="0"
						aria-describedby="transcript-instructions"
						bind:this={editableTranscript}
						on:pointerdown={warmTypewriterSounds}
						on:focus={handleTranscriptFocus}
						on:blur={handleTranscriptBlur}
						on:keydown={handleTranscriptKeydown}
						on:beforeinput={handleTranscriptBeforeInput}
						on:paste={handleTranscriptPaste}
						on:input={handleTranscriptInput}
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
		margin-top: 24px; /* Reduced space between button and transcript */
	}

	.final-transcript {
		margin-bottom: max(7rem, 14svh);
	}

	.copy-btn {
		min-height: 44px;
		min-width: 44px;
		touch-action: manipulation;
		transform-origin: center;
		/* Persistent gentle breathing — implies "tap me" through motion */
		animation: copy-breathe 2.8s ease-in-out infinite;
	}

	.copy-btn.copyNeedsGesture {
		height: 3.5rem;
		width: 3.5rem;
		box-shadow:
			0 14px 30px rgba(249, 168, 212, 0.32),
			0 0 0 5px rgba(255, 255, 255, 0.92);
		animation: copy-squeeze 1.65s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
	}

	.copy-btn.copyNeedsGesture::after {
		content: '';
		position: absolute;
		inset: -7px;
		border-radius: 9999px;
		border: 2px solid rgba(249, 168, 212, 0.42);
		pointer-events: none;
		animation: copy-ring 1.65s ease-out infinite;
	}

	@keyframes copy-breathe {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.06);
		}
	}

	@keyframes copy-squeeze {
		0%,
		100% {
			transform: scale(1);
		}
		36% {
			transform: scale(1.13);
		}
		52% {
			transform: scale(0.97);
		}
		70% {
			transform: scale(1.07);
		}
	}

	@keyframes copy-ring {
		0% {
			opacity: 0.8;
			transform: scale(0.86);
		}
		70%,
		100% {
			opacity: 0;
			transform: scale(1.18);
		}
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
		position: relative; /* For the pseudo-element highlight */
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

	/* Elegant hover effect - extremely subtle */
	.transcript-box:hover {
		box-shadow: 0 10px 30px rgba(249, 168, 212, 0.28);
		border-color: rgba(249, 168, 212, 0.4);
		transform: translateY(-0.5px) scale(1.001);
	}

	.transcript-wrapper.transcript-arrival-focus .transcript-box {
		animation: transcriptFocusBounce 0.68s cubic-bezier(0.2, 0.88, 0.22, 1.16) both;
	}

	@keyframes transcriptFocusBounce {
		0% {
			transform: translateY(8px) scale(0.985);
			box-shadow: 0 8px 24px rgba(249, 168, 212, 0.2);
		}
		58% {
			transform: translateY(-2px) scale(1.006);
			box-shadow: 0 14px 34px rgba(249, 168, 212, 0.3);
		}
		100% {
			transform: translateY(0) scale(1);
			box-shadow: 0 10px 30px rgba(249, 168, 212, 0.25);
		}
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
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: normal;
		tab-size: 2;
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
		scrollbar-color: var(--tt-scrollbar-thumb-color) transparent;
		scrollbar-gutter: stable;
		overscroll-behavior: contain; /* More controlled overscroll */
		-webkit-overflow-scrolling: touch; /* Smoother scrolling on iOS */
		transition:
			background-color 0.25s ease,
			box-shadow 0.25s ease;
	}

	/* Elegant text selection styling - flat color for better consistency */
	.transcript-box ::selection {
		background-color: rgba(236, 72, 153, 0.25); /* Consistent with cursor color */
		color: #111827;
		text-shadow: none; /* Remove text shadow for cleaner selection */
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
			scrollbar-gutter: auto;
		}

		.final-transcript .transcript-box {
			overflow: visible;
		}

		.final-transcript .transcript-content-area {
			max-height: none;
			overflow: visible;
			overscroll-behavior: auto;
			-webkit-overflow-scrolling: auto;
		}

		.custom-transcript-text {
			line-height: 1.72;
		}

		.copy-btn {
			right: 0.35rem;
			top: -1.1rem;
		}

		.copy-btn.copyNeedsGesture {
			right: 0.2rem;
			top: -1.35rem;
		}

		.transcript-content-area::-webkit-scrollbar {
			display: none; /* Hide scrollbar on Webkit browsers */
		}

		.transcript-wrapper {
			margin-top: 24px; /* Smaller gap on mobile */
		}

		.final-transcript {
			margin-bottom: max(14rem, 28svh);
		}

		.live-transcript {
			margin-top: 0.5rem;
		}

		.live-transcript .transcript-content-area {
			max-height: min(22vh, 190px);
			padding: 1rem 1rem 1.25rem;
		}

		.live-transcript .custom-transcript-text {
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

	@media (prefers-reduced-motion: reduce) {
		.copy-btn {
			animation: none;
		}

		.copy-btn.copyNeedsGesture {
			animation: none;
			transform: scale(1.08);
		}

		.copy-btn.copyNeedsGesture::after {
			animation: none;
			opacity: 0.75;
			transform: scale(1);
		}

		.transcript-box,
		.transcript-box::before,
		.transcript-wrapper.transcript-arrival-focus .transcript-box,
		.custom-transcript-text,
		.transcript-content-area,
		.animate-shadow-appear,
		.animate-text-appear {
			animation: none;
			transition-duration: 0.01ms;
		}
	}
</style>
