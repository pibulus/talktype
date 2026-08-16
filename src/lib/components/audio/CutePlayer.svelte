<script>
	// Tiny themed audio player — replaces the grey native <audio> chrome that
	// never matched the app. One row: squishy play button, pink seek bar, time.
	import { onDestroy } from 'svelte';
	import { formatDuration } from './recordButtonState.js';

	export let src = '';
	export let label = 'Play recording';
	export let autoplay = false;

	let audioEl;
	let playing = false;
	let duration = 0;
	let currentTime = 0;
	let scrubbing = false;

	$: progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

	function toggle() {
		if (!audioEl) return;
		if (playing) {
			audioEl.pause();
		} else {
			audioEl.play().catch(() => {});
		}
	}

	// Chrome reports Infinity for MediaRecorder blobs until forced to the end —
	// the classic seek-past-the-end nudge makes it compute the real duration.
	function handleLoadedMetadata() {
		if (!audioEl) return;
		if (Number.isFinite(audioEl.duration)) {
			duration = audioEl.duration;
			return;
		}
		const settle = () => {
			if (!audioEl) return;
			audioEl.removeEventListener('timeupdate', settle);
			audioEl.currentTime = 0;
			if (Number.isFinite(audioEl.duration)) duration = audioEl.duration;
		};
		audioEl.addEventListener('timeupdate', settle);
		audioEl.currentTime = 1e7;
	}

	function handleTimeUpdate() {
		if (!audioEl || scrubbing) return;
		if (Number.isFinite(audioEl.currentTime) && audioEl.currentTime < 1e6) {
			currentTime = audioEl.currentTime;
		}
		if (!Number.isFinite(duration) || duration === 0) {
			if (Number.isFinite(audioEl.duration)) duration = audioEl.duration;
		}
	}

	function handleSeekInput(event) {
		scrubbing = true;
		currentTime = Number(event.currentTarget.value);
	}

	function handleSeekCommit(event) {
		scrubbing = false;
		if (!audioEl) return;
		audioEl.currentTime = Number(event.currentTarget.value);
	}

	onDestroy(() => {
		audioEl?.pause();
	});
</script>

<div class="cute-player flex w-full items-center gap-2.5" role="group" aria-label={label}>
	<audio
		bind:this={audioEl}
		{src}
		{autoplay}
		preload="metadata"
		on:loadedmetadata={handleLoadedMetadata}
		on:durationchange={handleLoadedMetadata}
		on:timeupdate={handleTimeUpdate}
		on:play={() => (playing = true)}
		on:pause={() => (playing = false)}
		on:ended={() => {
			playing = false;
			currentTime = 0;
		}}
	></audio>

	<button
		type="button"
		class="play-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-pink-100 text-pink-800 shadow-sm ring-1 ring-pink-200/80 transition-transform duration-150 hover:scale-105 hover:shadow-md active:scale-90"
		on:click={toggle}
		aria-label={playing ? 'Pause' : 'Play'}
	>
		{#if playing}
			<svg class="h-3.5 w-3.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
				<rect x="1.5" y="1" width="3.2" height="10" rx="1.1" />
				<rect x="7.3" y="1" width="3.2" height="10" rx="1.1" />
			</svg>
		{:else}
			<svg class="ml-0.5 h-3.5 w-3.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
				<path
					d="M2.6 1.6a1 1 0 0 1 1.52-.86l7.1 4.4a1 1 0 0 1 0 1.7l-7.1 4.4a1 1 0 0 1-1.52-.85V1.6z"
				/>
			</svg>
		{/if}
	</button>

	<input
		type="range"
		class="seek-bar min-w-0 flex-1"
		min="0"
		max={duration || 0}
		step="0.1"
		value={currentTime}
		disabled={!duration}
		style={`--fill: ${progress}%`}
		on:input={handleSeekInput}
		on:change={handleSeekCommit}
		aria-label="Seek through the recording"
	/>

	<span class="shrink-0 text-[10px] font-bold tabular-nums text-gray-400">
		{formatDuration(currentTime)}<span class="mx-0.5 opacity-60">/</span>{formatDuration(
			duration || 0
		)}
	</span>
</div>

<style>
	.seek-bar {
		appearance: none;
		-webkit-appearance: none;
		height: 8px;
		border-radius: 9999px;
		background: linear-gradient(
			to right,
			rgba(244, 114, 182, 0.85) var(--fill, 0%),
			rgba(252, 231, 243, 0.9) var(--fill, 0%)
		);
		box-shadow: inset 0 1px 2px rgba(190, 24, 93, 0.08);
		cursor: pointer;
	}

	.seek-bar:disabled {
		cursor: default;
		opacity: 0.6;
	}

	.seek-bar::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		height: 16px;
		width: 16px;
		border-radius: 9999px;
		background: #fffef7;
		border: 2px solid rgba(244, 114, 182, 0.9);
		box-shadow: 0 1px 4px rgba(190, 24, 93, 0.25);
		transition: transform 120ms ease;
	}

	.seek-bar::-webkit-slider-thumb:active {
		transform: scale(1.2);
	}

	.seek-bar::-moz-range-thumb {
		height: 16px;
		width: 16px;
		border-radius: 9999px;
		background: #fffef7;
		border: 2px solid rgba(244, 114, 182, 0.9);
		box-shadow: 0 1px 4px rgba(190, 24, 93, 0.25);
	}

	.seek-bar:focus-visible {
		outline: 2px solid rgba(244, 114, 182, 0.7);
		outline-offset: 2px;
	}
</style>
