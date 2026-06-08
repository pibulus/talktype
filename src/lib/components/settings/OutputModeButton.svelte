<script>
	export let mode = {
		id: 'standard',
		label: 'After Stop',
		visual: 'standard'
	};
	export let selected = false;
	export let offlineStatus = {};
	export let onSelect = () => {};

	$: isOffline = mode.id === 'offline';
	$: safeProgress = Math.max(0, Math.min(100, Math.round(Number(offlineStatus.progress) || 0)));
	$: hasOfflineState =
		isOffline &&
		(selected ||
			offlineStatus.visible ||
			offlineStatus.loading ||
			offlineStatus.loaded ||
			offlineStatus.cached ||
			offlineStatus.error);
	$: offlineFillPercent =
		!isOffline || !hasOfflineState
			? 0
			: offlineStatus.loading
				? Math.max(8, safeProgress)
				: offlineStatus.loaded || offlineStatus.cached
					? 100
					: offlineStatus.error
						? Math.max(18, safeProgress)
						: selected
							? 18
							: 0;
	$: buttonStyle = isOffline
		? `--offline-progress: ${offlineFillPercent.toFixed(2)}%; --offline-progress-ratio: ${(
				offlineFillPercent / 100
			).toFixed(4)};`
		: '';
	$: offlineStatusLabel = offlineStatus.label || (selected ? 'Local' : '');
	$: offlineAriaText = offlineStatus.statusText || offlineStatusLabel || 'Offline model';
	$: ariaLabel = isOffline
		? `Set output mode to Offline. ${offlineAriaText}`
		: `Set output mode to ${mode.label}`;
</script>

<button
	type="button"
	class="mode-option"
	class:is-selected={selected}
	class:is-offline={isOffline}
	class:has-offline-state={hasOfflineState}
	class:offline-loading={isOffline && offlineStatus.loading}
	class:offline-ready={isOffline && offlineStatus.loaded}
	class:offline-cached={isOffline && offlineStatus.cached && !offlineStatus.loaded}
	class:offline-error={isOffline && offlineStatus.error}
	style={buttonStyle}
	aria-pressed={selected}
	aria-label={ariaLabel}
	on:click={() => onSelect(mode)}
>
	{#if isOffline}
		<span class="offline-progress-track" aria-hidden="true">
			<span class="offline-progress-fill"></span>
			<span class="offline-progress-head"></span>
		</span>
	{/if}

	<span class="mode-content">
		<span class="mode-mark mode-mark-{mode.visual}" aria-hidden="true">
			<span></span>
		</span>
		<span class="mode-copy">
			<span class="mode-label">{mode.label}</span>
			{#if hasOfflineState && offlineStatusLabel}
				<span class="offline-status-label" aria-live="polite">{offlineStatusLabel}</span>
			{/if}
		</span>
	</span>
</button>

<style>
	.mode-option {
		position: relative;
		isolation: isolate;
		display: flex;
		min-height: 72px;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 1px solid #fce7f3;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.72);
		padding: 0.5rem;
		color: #4b5563;
		text-align: center;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
		transition:
			transform 0.22s ease,
			border-color 0.22s ease,
			background 0.22s ease,
			box-shadow 0.22s ease;
	}

	.mode-option:hover {
		border-color: #fbcfe8;
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 4px 10px rgba(244, 114, 182, 0.11);
		transform: translateY(-1px);
	}

	.mode-option:active {
		transform: translateY(1px) scale(0.985);
	}

	.mode-option:focus-visible {
		outline: 3px solid rgba(251, 191, 36, 0.8);
		outline-offset: 2px;
	}

	.mode-option.is-selected {
		border-color: #f9a8d4;
		background: #fdf2f8;
		color: #111827;
		box-shadow:
			0 0 0 2px rgba(252, 231, 243, 0.95),
			0 5px 12px rgba(244, 114, 182, 0.14);
	}

	.mode-option.is-offline {
		--offline-progress: 0%;
		--offline-progress-ratio: 0;
		--offline-progress-fill: linear-gradient(90deg, #7dd3fc 0%, #5eead4 58%, #c4b5fd 100%);
		--offline-progress-track: linear-gradient(
			135deg,
			rgba(240, 249, 255, 0.96),
			rgba(253, 244, 255, 0.9)
		);
	}

	.mode-option.offline-ready,
	.mode-option.offline-cached {
		border-color: rgba(45, 212, 191, 0.46);
	}

	.mode-option.offline-ready.is-selected,
	.mode-option.offline-cached.is-selected {
		border-color: rgba(45, 212, 191, 0.72);
		box-shadow:
			0 0 0 2px rgba(153, 246, 228, 0.42),
			0 6px 14px rgba(20, 184, 166, 0.16);
	}

	.mode-option.offline-error {
		--offline-progress-fill: linear-gradient(90deg, #fecaca 0%, #fb7185 62%, #f472b6 100%);
		border-color: rgba(251, 113, 133, 0.72);
	}

	.mode-content {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		min-width: 0;
	}

	.mode-copy {
		display: flex;
		min-width: 0;
		flex-direction: column;
		align-items: center;
		gap: 0.12rem;
		line-height: 1.05;
	}

	.mode-label {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0;
	}

	.offline-status-label {
		max-width: 100%;
		border: 1px solid rgba(15, 118, 110, 0.14);
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.58);
		padding: 0.1rem 0.36rem;
		color: #0f766e;
		font-size: 0.61rem;
		font-weight: 900;
		letter-spacing: 0;
		white-space: nowrap;
	}

	.offline-loading .offline-status-label {
		color: #0369a1;
	}

	.offline-error .offline-status-label {
		border-color: rgba(190, 18, 60, 0.14);
		color: #be123c;
	}

	.offline-progress-track {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		border-radius: inherit;
		background: var(--offline-progress-track);
		opacity: 0;
		transition: opacity 220ms ease;
	}

	.has-offline-state .offline-progress-track {
		opacity: 1;
	}

	.offline-progress-track::after {
		content: '';
		position: absolute;
		inset: 2px;
		border: 1px solid rgba(255, 255, 255, 0.42);
		border-radius: inherit;
		pointer-events: none;
	}

	.offline-progress-fill {
		position: absolute;
		inset: 0;
		background: var(--offline-progress-fill);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.28),
			0 0 16px rgba(45, 212, 191, 0.2);
		transform: scaleX(var(--offline-progress-ratio));
		transform-origin: left center;
		transition: transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.offline-progress-head {
		position: absolute;
		top: 10px;
		bottom: 10px;
		left: clamp(10px, var(--offline-progress), calc(100% - 10px));
		width: 2px;
		border-radius: 9999px;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0),
			rgba(255, 255, 255, 0.84) 24%,
			rgba(255, 255, 255, 0.84) 76%,
			rgba(255, 255, 255, 0)
		);
		box-shadow:
			0 0 8px rgba(255, 255, 255, 0.58),
			0 0 12px rgba(45, 212, 191, 0.22);
		opacity: 0;
		transform: translateX(-50%);
		transition:
			left 380ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 180ms ease;
	}

	.offline-loading .offline-progress-head {
		opacity: 1;
	}

	.offline-loading .offline-progress-fill {
		animation: offline-fill-glow 1.8s ease-in-out infinite;
	}

	.mode-mark {
		display: inline-flex;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 241, 248, 0.9));
		box-shadow:
			inset 0 0 0 1px rgba(244, 114, 182, 0.18),
			0 4px 10px rgba(244, 114, 182, 0.12);
	}

	.mode-mark span {
		display: block;
	}

	.mode-mark-standard span {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 9999px;
		background: #f59e0b;
		box-shadow: 0 0 0 0.28rem rgba(245, 158, 11, 0.18);
	}

	.mode-mark-live {
		gap: 0.12rem;
	}

	.mode-mark-live::before,
	.mode-mark-live span,
	.mode-mark-live::after {
		content: '';
		width: 0.22rem;
		border-radius: 9999px;
		background: #22c5cf;
	}

	.mode-mark-live::before {
		height: 0.65rem;
		opacity: 0.7;
	}

	.mode-mark-live span {
		height: 1.15rem;
	}

	.mode-mark-live::after {
		height: 0.85rem;
		opacity: 0.8;
	}

	.mode-mark-offline span {
		width: 1rem;
		height: 1rem;
		border-radius: 0.25rem;
		background:
			linear-gradient(45deg, transparent 49%, #8b5cf6 50% 56%, transparent 57%) 0 0 / 100% 100%,
			linear-gradient(135deg, transparent 49%, #8b5cf6 50% 56%, transparent 57%) 0 0 / 100% 100%;
		box-shadow: inset 0 -0.28rem 0 #8b5cf6;
	}

	@keyframes offline-fill-glow {
		0%,
		100% {
			filter: saturate(1);
		}
		50% {
			filter: saturate(1.12) brightness(1.03);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mode-option,
		.offline-progress-fill,
		.offline-progress-head {
			transition-duration: 120ms;
		}

		.offline-loading .offline-progress-fill {
			animation: none;
		}
	}
</style>
