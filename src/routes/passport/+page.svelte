<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { theme } from '$lib';
	import MembershipCard from '$lib/cartridges/MembershipCard.svelte';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { Seo } from '$lib/components/layout';
	import { STORAGE_KEYS } from '$lib/constants';
	import { setSupporterStatus } from '$lib/services';
	import { restoreTranscriptsFromVault } from '$lib/services/storage/vaultTranscriptBackup.js';
	import { getVaultHash } from '$lib/services/syncService.js';
	import { saveStoredSupporterCode } from '$lib/services/vaultHashStorage.js';

	let status = 'checking';
	let message = 'Reading Passport...';
	let passportCode = '';
	let manualCode = '';
	let vaultServerUrl = '';
	let vaultHash = '';
	let errorMessage = '';
	let restoreSummary = null;
	let restoreProgress = null;

	function getPassportParams() {
		const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
		const queryParams = new URLSearchParams(window.location.search);

		return {
			code: hashParams.get('code') || queryParams.get('code') || '',
			vault:
				hashParams.get('vault') ||
				hashParams.get('vaultUrl') ||
				queryParams.get('vault') ||
				queryParams.get('vaultUrl') ||
				''
		};
	}

	async function redeemPassportCode(code) {
		try {
			const response = await fetch('/api/supporter/redeem', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});
			const payload = await response.json().catch(() => ({}));

			return response.ok && payload.valid ? payload.token || null : null;
		} catch (error) {
			console.warn('Passport token refresh failed:', error);
			return null;
		}
	}

	async function rememberPassport(nextCode, nextVaultUrl = '') {
		const savedCode = saveStoredSupporterCode(nextCode);
		const token = await redeemPassportCode(savedCode);
		passportCode = savedCode;
		manualCode = '';
		setSupporterStatus(true, token);

		if (nextVaultUrl.trim()) {
			vaultServerUrl = nextVaultUrl.trim();
			localStorage.setItem(STORAGE_KEYS.VAULT_SERVER_URL, vaultServerUrl);
		}

		vaultHash = await getVaultHash(savedCode);
		window.history.replaceState({}, '', '/passport');
	}

	async function syncFromVault() {
		if (!passportCode) {
			errorMessage = 'Enter your Passport code first.';
			return;
		}
		if (!vaultServerUrl.trim()) {
			errorMessage = 'Enter your Vault URL to sync history.';
			return;
		}

		status = 'syncing';
		errorMessage = '';
		restoreSummary = null;
		restoreProgress = { current: 0, total: 0, audioCount: 0, audioFailed: 0 };
		localStorage.setItem(STORAGE_KEYS.VAULT_SERVER_URL, vaultServerUrl.trim());

		try {
			const summary = await restoreTranscriptsFromVault({
				code: passportCode,
				serverUrl: vaultServerUrl,
				includeAudio: true,
				onProgress: (progress) => {
					restoreProgress = progress;
				}
			});

			restoreSummary = summary;
			status = 'ready';
			if (summary.missing) {
				message = 'Passport imported. No Vault backup found yet.';
			} else {
				message = `Synced ${summary.total} transcript${summary.total === 1 ? '' : 's'} from Vault.`;
			}
		} catch (error) {
			console.error('Passport sync failed:', error);
			status = 'ready';
			errorMessage = error.message || 'Vault sync needs one more try.';
			message = 'Passport imported. Vault sync did not finish.';
		}
	}

	async function importPassport(
		nextCode = manualCode,
		nextVaultUrl = vaultServerUrl,
		shouldSync = false
	) {
		errorMessage = '';
		restoreSummary = null;

		if (!nextCode.trim()) {
			errorMessage = 'Enter your Passport code.';
			status = 'manual';
			return;
		}

		status = 'importing';
		message = 'Importing Passport...';

		try {
			await rememberPassport(nextCode, nextVaultUrl);
			status = 'ready';
			message = 'Passport imported on this device.';

			if (shouldSync && nextVaultUrl.trim()) {
				await syncFromVault();
			}
		} catch (error) {
			console.error('Passport import failed:', error);
			status = 'manual';
			errorMessage = error.message || 'Passport import needs one more try.';
			message = 'Enter your Passport details.';
		}
	}

	onMount(() => {
		if (!browser) return;

		const params = getPassportParams();
		vaultServerUrl = params.vault || localStorage.getItem(STORAGE_KEYS.VAULT_SERVER_URL) || '';

		if (params.code) {
			importPassport(params.code, vaultServerUrl, Boolean(vaultServerUrl));
			return;
		}

		status = 'manual';
		message = 'Scan a Passport QR or enter your code.';
	});
</script>

<Seo
	title="Passport Sync | TalkType"
	description="Import your TalkType Passport and sync encrypted history."
	path="/passport"
	noindex={true}
	includeStructuredData={false}
/>

<main class="min-h-screen bg-[#fffaef] px-5 py-8 text-gray-800 sm:py-10">
	<section class="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
		<div class="h-28 w-28">
			<DisplayGhost theme={$theme} size="100%" />
		</div>

		<div class="space-y-2">
			<p class="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">TalkType Passport</p>
			<h1 class="text-3xl font-black tracking-tight">
				{status === 'syncing' ? 'Syncing from Vault' : 'Passport sync'}
			</h1>
			<p class="text-sm leading-6 text-gray-600">{message}</p>
		</div>

		{#if vaultHash}
			<MembershipCard {vaultHash} {passportCode} />
		{/if}

		<div class="w-full rounded-2xl border border-pink-100 bg-white/80 p-4 text-left shadow-sm">
			<form
				class="space-y-3"
				on:submit|preventDefault={() => importPassport(passportCode || manualCode, vaultServerUrl)}
			>
				{#if !passportCode}
					<label class="block">
						<span class="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
							Passport code
						</span>
						<input
							type="text"
							class="min-h-12 w-full rounded-xl border border-pink-100 bg-[#fffdf5] px-4 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
							placeholder="TT-..."
							bind:value={manualCode}
							autocomplete="one-time-code"
							autocapitalize="characters"
							spellcheck="false"
						/>
					</label>
				{/if}

				<label class="block">
					<span class="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
						Vault URL
					</span>
					<input
						type="url"
						class="min-h-12 w-full rounded-xl border border-pink-100 bg-[#fffdf5] px-4 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
						placeholder="https://vault.local:3000"
						bind:value={vaultServerUrl}
						autocomplete="url"
					/>
				</label>

				<div class="grid gap-2 sm:grid-cols-2">
					<button
						type="submit"
						class="btn min-h-12 border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600 disabled:opacity-60"
						disabled={status === 'importing' || status === 'syncing'}
					>
						{passportCode ? 'Save details' : 'Import Passport'}
					</button>
					<button
						type="button"
						class="btn min-h-12 border-pink-100 bg-white text-pink-600 transition-colors duration-150 hover:border-pink-200 hover:bg-pink-50 disabled:opacity-60"
						on:click={syncFromVault}
						disabled={!passportCode || status === 'syncing'}
					>
						{status === 'syncing' ? 'Syncing...' : 'Sync from Vault'}
					</button>
				</div>
			</form>

			{#if restoreProgress && status === 'syncing'}
				<p class="mt-3 text-xs font-bold text-pink-700" aria-live="polite">
					{restoreProgress.current}/{restoreProgress.total} processed
				</p>
			{/if}

			{#if errorMessage}
				<p class="mt-3 text-sm font-bold text-amber-700" aria-live="polite">
					{errorMessage}
				</p>
			{/if}

			{#if restoreSummary && !restoreSummary.missing}
				<p class="mt-3 text-sm font-bold text-emerald-700" aria-live="polite">
					Imported {restoreSummary.imported}, updated {restoreSummary.updated}. Audio clips
					restored:
					{restoreSummary.audioCount}.
				</p>
			{/if}
		</div>

		<a
			href="/"
			class="btn min-h-12 w-full rounded-2xl border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600"
		>
			Return to TalkType
		</a>
	</section>
</main>
