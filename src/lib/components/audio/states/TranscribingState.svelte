<script>
	export let progress = 0;

	$: safeProgress = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
	$: visualProgress = safeProgress > 0 ? safeProgress : 16;
	$: visualRatio = visualProgress / 100;
	$: label = 'Processing';
</script>

<div
	class="progress-container relative mx-auto flex h-[64px] w-[90%] max-w-[420px] items-center justify-center overflow-hidden rounded-full bg-amber-200 shadow-md shadow-black/10 sm:h-[64px] sm:w-[85%]"
	role="progressbar"
	aria-label={label}
	aria-valuenow={safeProgress}
	aria-valuemin="0"
	aria-valuemax="100"
>
	<div
		class="progress-bar h-full bg-gradient-to-r from-amber-400 to-rose-300"
		style="--progress-ratio: {visualRatio};"
	></div>
	<span class="sr-only">{label}</span>
	<span class="processing-dots relative z-10" aria-hidden="true">
		<span></span>
		<span></span>
		<span></span>
	</span>
</div>

<style>
	/* Progress container styling */
	.progress-container {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		background:
			linear-gradient(135deg, rgba(254, 243, 199, 0.96), rgba(251, 191, 36, 0.28)),
			rgba(253, 230, 138, 0.86);
		transition:
			box-shadow 0.3s ease,
			background 0.3s ease;
	}

	.progress-bar {
		position: absolute;
		inset: 0;
		transform: scaleX(var(--progress-ratio, 0.16));
		transform-origin: left center;
		transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
		animation: pulse-glow 1.5s infinite ease-in-out;
	}

	.processing-dots {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}

	.processing-dots span {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 9999px;
		background: rgba(17, 24, 39, 0.76);
		animation: dot-breathe 1.15s ease-in-out infinite;
	}

	.processing-dots span:nth-child(2) {
		animation-delay: 0.14s;
	}

	.processing-dots span:nth-child(3) {
		animation-delay: 0.28s;
	}

	@keyframes dot-breathe {
		0%,
		100% {
			opacity: 0.35;
			transform: scale(0.82);
		}
		50% {
			opacity: 0.9;
			transform: scale(1);
		}
	}

	@keyframes pulse-glow {
		0% {
			box-shadow: inset 0 0 5px rgba(255, 190, 60, 0.5);
		}
		50% {
			box-shadow: inset 0 0 15px rgba(255, 190, 60, 0.8);
		}
		100% {
			box-shadow: inset 0 0 5px rgba(255, 190, 60, 0.5);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.progress-bar,
		.processing-dots span {
			animation: none;
		}

		.progress-bar {
			transition-duration: 120ms;
		}
	}
</style>
