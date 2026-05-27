<script>
	import { BUTTON_LABELS } from '$lib/constants';

	export let progress = 0;
	export let statusText = BUTTON_LABELS.DOWNLOADING;
	export let detail = '';

	$: safeProgress = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
	$: displayText =
		statusText && statusText !== BUTTON_LABELS.DOWNLOADING
			? statusText
			: safeProgress > 0
				? `Downloading offline model ${safeProgress}%`
				: BUTTON_LABELS.DOWNLOADING;
</script>

<div
	class="progress-container loading-state relative mx-auto flex min-h-[72px] w-[90%] max-w-[420px] items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-gradient-to-r from-blue-100 via-cyan-100 to-indigo-100 px-5 shadow-md shadow-black/10 sm:w-[85%]"
	role="progressbar"
	aria-label={displayText}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={safeProgress}
>
	<div
		class="progress-fill absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-200 via-teal-200 to-violet-200"
		style={`width: ${safeProgress}%;`}
	></div>
	<div class="loading-shimmer absolute inset-0"></div>
	<div class="relative z-10 flex h-full min-w-0 flex-col items-center justify-center text-center">
		<span
			class="loading-text block max-w-full truncate text-base font-black leading-tight text-black sm:text-lg"
			style="letter-spacing: 0;"
		>
			{displayText}
		</span>
		{#if detail}
			<span class="mt-0.5 block max-w-full truncate text-xs font-bold text-gray-600">{detail}</span>
		{/if}
	</div>
</div>

<style>
	/* Progress container styling */
	.progress-container {
		position: relative;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.progress-fill {
		min-width: 10%;
		transition: width 0.35s ease;
		opacity: 0.85;
	}

	/* Loading state styles */
	.loading-state {
		animation: pulse-loading 2s ease-in-out infinite;
	}

	.loading-shimmer {
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 255, 255, 0.4) 50%,
			transparent 100%
		);
		animation: shimmer-loading 1.5s ease-in-out infinite;
	}

	.loading-text {
		animation: pulse-text 1.5s ease-in-out infinite;
	}

	@keyframes shimmer-loading {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	@keyframes pulse-loading {
		0%,
		100% {
			box-shadow:
				0 4px 6px -1px rgba(251, 191, 36, 0.2),
				0 2px 4px -1px rgba(0, 0, 0, 0.1);
		}
		50% {
			box-shadow:
				0 6px 10px -1px rgba(251, 191, 36, 0.3),
				0 4px 6px -1px rgba(0, 0, 0, 0.15);
		}
	}

	@keyframes pulse-text {
		0%,
		100% {
			opacity: 0.8;
		}
		50% {
			opacity: 1;
		}
	}
</style>
