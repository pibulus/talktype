<script>
	import { BUTTON_LABELS } from '$lib/constants';
</script>

<!-- Downloading: Indeterminate shimmer (can't track HuggingFace download) -->
<div
	class="progress-container loading-state relative mx-auto flex h-[64px] w-[90%] max-w-[420px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-200 to-indigo-200 shadow-md shadow-black/10 sm:h-[64px] sm:w-[85%]"
	role="status"
	aria-label="Downloading offline model"
>
	<div class="loading-shimmer absolute inset-0"></div>
	<div class="flex h-full items-center justify-center">
		<span
			class="loading-text relative z-10 text-xl font-bold text-black"
			style="letter-spacing: 0.02em;"
		>
			{BUTTON_LABELS.DOWNLOADING}
		</span>
	</div>
</div>

<style>
	/* Progress container styling */
	.progress-container {
		position: relative;
		overflow: hidden;
		transition: all 0.3s ease;
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
