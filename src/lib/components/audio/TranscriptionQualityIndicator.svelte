<script>
	import { transcriptionQuality } from '$lib/services/transcription/instantTranscription';
	import { fade } from 'svelte/transition';
	
	$: quality = $transcriptionQuality.quality;
	$: message = $transcriptionQuality.message;
	$: isUpgrading = $transcriptionQuality.isUpgrading;
</script>

{#if message}
	<div class="transcription-quality" transition:fade={{ duration: 200 }}>
		<div class="quality-badge {quality}">
			{#if isUpgrading}
				<span class="loading-dot"></span>
			{/if}
			<span class="quality-text">{message}</span>
		</div>
	</div>
{/if}

<style>
	.transcription-quality {
		position: fixed;
		bottom: 20px;
		left: 20px;
		z-index: 100;
		pointer-events: none;
	}

	.quality-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: rgba(255, 255, 255, 0.95);
		border: 2px solid;
		border-radius: 20px;
		font-size: 11px;
		font-weight: 600;
		backdrop-filter: blur(10px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.quality-badge.instant {
		border-color: #60a5fa;
		color: #2563eb;
	}

	.quality-badge.loading {
		border-color: #fbbf24;
		color: #d97706;
	}

	.quality-badge.high {
		border-color: #34d399;
		color: #059669;
	}

	.loading-dot {
		width: 6px;
		height: 6px;
		background: currentColor;
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	.quality-text {
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
</style>