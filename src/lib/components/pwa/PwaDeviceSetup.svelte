<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { STORAGE_KEYS } from '$lib/constants';
	import { privacyMode } from '$lib';
	import { whisperService, whisperStatus } from '$lib/services/transcription/whisper/whisperService';

	export let disabled = false;

	let visible = false;
	let isPriming = false;
	let didPrime = false;
	let error = '';
	let status = 'Set up this iPhone';
	let canOpenInSafari = false;

	function isIOSDevice() {
		if (!browser) return false;
		return (
			/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
		);
	}

	function isStandalonePwa() {
		if (!browser) return false;
		return (
			window.matchMedia?.('(display-mode: standalone)').matches === true ||
			window.matchMedia?.('(display-mode: fullscreen)').matches === true ||
			navigator.standalone === true
		);
	}

	function shouldShowSetup() {
		if (!browser || disabled || !isIOSDevice() || !isStandalonePwa()) return false;
		if (localStorage.getItem(STORAGE_KEYS.PWA_DEVICE_PRIMED) === 'true') return false;
		if (localStorage.getItem(STORAGE_KEYS.PWA_DEVICE_SETUP_DISMISSED) === 'true') return false;
		return true;
	}

	function stopTracks(stream) {
		stream?.getTracks?.().forEach((track) => track.stop());
	}

	async function requestMicOnce() {
		if (!navigator.mediaDevices?.getUserMedia) {
			throw new Error('Microphone setup is not available in this browser.');
		}

		const constraints = {
			audio: {
				echoCancellation: true,
				autoGainControl: true,
				noiseSuppression: true
			}
		};

		try {
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			stopTracks(stream);
			return true;
		} catch {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stopTracks(stream);
			return true;
		}
	}

	async function requestPersistentStorage() {
		if (!navigator.storage?.persist) return null;
		const alreadyPersistent = await navigator.storage.persisted?.();
		return alreadyPersistent || (await navigator.storage.persist());
	}

	async function primeDevice() {
		if (!browser || isPriming) return;

		isPriming = true;
		error = '';
		status = 'Checking mic';

		try {
			await requestMicOnce();

			status = 'Saving offline space';
			await requestPersistentStorage();

			status = 'Getting offline model';
			const result = await whisperService.preloadModel();
			if (!result?.success) {
				throw result?.error || new Error('Offline model did not finish downloading.');
			}

			if (get(privacyMode) !== 'true') {
				await whisperService.unloadModel();
			}

			localStorage.setItem(STORAGE_KEYS.PWA_DEVICE_PRIMED, 'true');
			localStorage.removeItem(STORAGE_KEYS.PWA_DEVICE_SETUP_DISMISSED);
			status = 'Ready';
			didPrime = true;
			setTimeout(() => {
				visible = false;
			}, 1200);
		} catch (setupError) {
			error =
				setupError?.name === 'NotAllowedError' || /permission|allowed|denied/i.test(setupError?.message)
					? 'Mic still needs Safari permission.'
					: setupError?.message || 'Setup needs one more try.';
			status = 'Try again';
			canOpenInSafari = isStandalonePwa();
		} finally {
			isPriming = false;
		}
	}

	function dismiss() {
		localStorage.setItem(STORAGE_KEYS.PWA_DEVICE_SETUP_DISMISSED, 'true');
		visible = false;
	}

	function openInSafari() {
		window.open(window.location.href, '_blank', 'noopener');
	}

	onMount(() => {
		if (!browser) return;
		visible = shouldShowSetup();
	});

	$: offlineProgress = Math.max(0, Math.min(100, Math.round(Number($whisperStatus.progress) || 0)));
	$: isDownloadingModel = isPriming && $whisperStatus.isLoading;
	$: buttonLabel = isDownloadingModel ? `${offlineProgress}%` : status;
	$: if (browser && visible && disabled) {
		visible = false;
	}
</script>

{#if visible}
	<div class="device-setup mx-auto mt-2 w-[min(92vw,380px)]" aria-live="polite">
		<div class="setup-shell">
			<div class="setup-copy">
				<div class="setup-title">{didPrime ? 'Ready' : 'Prime the ghost'}</div>
				<div class="setup-detail">
					{#if error}
						{error}
					{:else if isDownloadingModel}
						{$whisperStatus.statusText || 'Getting offline model'}
					{:else}
						Mic, storage, offline model.
					{/if}
				</div>
			</div>

			<div class="setup-actions">
				{#if canOpenInSafari && error}
					<button type="button" class="setup-secondary" on:click={openInSafari}>Safari</button>
				{/if}
				<button
					type="button"
					class="setup-primary"
					on:click={primeDevice}
					disabled={isPriming}
					aria-busy={isPriming}
				>
					{buttonLabel}
				</button>
				<button type="button" class="setup-dismiss" on:click={dismiss} aria-label="Dismiss setup">
					×
				</button>
			</div>
		</div>

		{#if isDownloadingModel}
			<div
				class="setup-progress"
				role="progressbar"
				aria-label={$whisperStatus.statusText || 'Offline model download progress'}
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={offlineProgress}
			>
				<div class="setup-progress-fill" style={`width: ${offlineProgress}%;`}></div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.setup-shell {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid rgba(249, 168, 212, 0.44);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.82);
		box-shadow: 0 12px 28px rgba(249, 168, 212, 0.16);
		padding: 0.55rem 0.55rem 0.55rem 1rem;
		backdrop-filter: blur(10px);
	}

	.setup-copy {
		min-width: 0;
		text-align: left;
	}

	.setup-title {
		color: #111827;
		font-size: 0.82rem;
		font-weight: 900;
		letter-spacing: 0;
		line-height: 1.1;
	}

	.setup-detail {
		margin-top: 0.1rem;
		color: #6b7280;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0;
		line-height: 1.15;
	}

	.setup-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.setup-primary,
	.setup-secondary,
	.setup-dismiss {
		min-height: 44px;
		border: 0;
		border-radius: 999px;
		font-weight: 900;
		letter-spacing: 0;
		touch-action: manipulation;
	}

	.setup-primary {
		min-width: 88px;
		background: linear-gradient(135deg, #ff7bab, #f6a43a);
		color: white;
		padding: 0 1rem;
		box-shadow: 0 8px 18px rgba(255, 92, 159, 0.2);
	}

	.setup-primary:disabled {
		opacity: 0.76;
	}

	.setup-secondary {
		background: #fff7ed;
		color: #9a3412;
		padding: 0 0.85rem;
	}

	.setup-dismiss {
		width: 44px;
		background: rgba(255, 255, 255, 0.78);
		color: #6b7280;
		font-size: 1.1rem;
	}

	.setup-primary:focus-visible,
	.setup-secondary:focus-visible,
	.setup-dismiss:focus-visible {
		outline: 3px solid rgba(245, 158, 11, 0.72);
		outline-offset: 3px;
	}

	.setup-progress {
		height: 0.35rem;
		margin: 0.45rem 1rem 0;
		overflow: hidden;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.7);
	}

	.setup-progress-fill {
		height: 100%;
		min-width: 8%;
		border-radius: inherit;
		background: linear-gradient(90deg, #7dd3fc, #86efac, #c4b5fd);
		transition: width 0.3s ease;
	}
</style>
