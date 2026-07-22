<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { theme } from '$lib';
	import MembershipCard from '$lib/cartridges/MembershipCard.svelte';
	import Confetti from '$lib/components/ui/effects/Confetti.svelte';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { Seo } from '$lib/components/layout';
	import { setSupporterStatus } from '$lib/services';
	import { checkPassportNotes } from '$lib/services/storage/passportNotesCheck.js';
	import { getVaultHash } from '$lib/services/syncService.js';
	import {
		readStoredSupporterCode,
		readStoredVaultServerUrl,
		saveStoredSupporterCode,
		saveStoredVaultServerUrl
	} from '$lib/services/vaultHashStorage.js';

	let status = 'checking';
	let message = 'Just a sec...';
	let passportCode = '';
	let manualCode = '';
	let vaultServerUrl = '';
	let vaultHash = '';
	let errorMessage = '';
	let restoreSummary = null;
	let showConfetti = false;

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
		const token = await redeemPassportCode(nextCode);
		if (!token) {
			throw new Error('Check your Passport code and try once more.');
		}

		const savedCode = saveStoredSupporterCode(nextCode);
		passportCode = savedCode;
		manualCode = '';
		setSupporterStatus(true, token);

		if (nextVaultUrl.trim()) {
			vaultServerUrl = saveStoredVaultServerUrl(nextVaultUrl);
		}

		vaultHash = await getVaultHash(savedCode);
		window.history.replaceState({}, '', '/passport');
	}

	async function getNotes() {
		if (!passportCode) {
			errorMessage = 'Enter your Passport code first.';
			return;
		}
		if (!vaultServerUrl.trim()) {
			message = 'Passport connected.';
			return { skipped: true, reason: 'no-notes-source' };
		}

		status = 'getting';
		message = 'Fetching your memories...';
		errorMessage = '';
		restoreSummary = null;
		saveStoredVaultServerUrl(vaultServerUrl);

		try {
			const summary = await checkPassportNotes({
				force: true,
				readCode: () => passportCode,
				readServerUrl: () => vaultServerUrl
			});

			restoreSummary = summary;
			status = 'ready';
			message =
				summary.action === 'pulled' ? 'Your notes followed you here.' : 'Ghost remembers you.';
			return summary;
		} catch (error) {
			console.error('Passport notes import failed:', error);
			status = 'ready';
			errorMessage = 'Vault was quiet. Try again in a moment.';
			message = 'Ghost remembers you.';
			return { skipped: true, reason: 'failed', error };
		}
	}

	async function importPassport(
		nextCode = manualCode,
		nextVaultUrl = vaultServerUrl,
		shouldRestore = false
	) {
		errorMessage = '';
		restoreSummary = null;

		if (!nextCode.trim()) {
			errorMessage = 'Enter your Passport code.';
			status = 'manual';
			return;
		}

		const isFirstTime = !readStoredSupporterCode();
		status = 'importing';
		message = 'Waking the ghost...';

		try {
			await rememberPassport(nextCode, nextVaultUrl);
			status = 'ready';
			message = isFirstTime ? 'Your passport is ready.' : 'Ghost remembers you.';

			if (isFirstTime) showConfetti = true;

			if (shouldRestore && vaultServerUrl.trim()) {
				await getNotes();
			}
		} catch (error) {
			console.error('Passport import failed:', error);
			status = 'manual';
			errorMessage = error.message || 'The ghost went quiet. Check your code and try again.';
			message = 'Enter your code to continue.';
		}
	}

	onMount(() => {
		if (!browser) return;

		const params = getPassportParams();
		vaultServerUrl = params.vault || readStoredVaultServerUrl();

		if (params.code) {
			importPassport(params.code, vaultServerUrl, Boolean(vaultServerUrl));
			return;
		}

		status = 'manual';
		message = 'Scan your Passport QR or type your code.';
	});
</script>

<Seo
	title="TalkType Passport | TalkType"
	description="Connect a TalkType Passport on this device."
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
				{status === 'getting'
					? 'Fetching your memories'
					: status === 'ready' && showConfetti
						? 'Welcome home'
						: status === 'ready'
							? 'Ghost remembers you'
							: status === 'importing'
								? 'Waking the ghost'
								: 'Your Passport'}
			</h1>
			<p class="text-sm leading-6 text-gray-600">{message}</p>
		</div>

		{#if vaultHash}
			<MembershipCard {vaultHash} {passportCode} />
		{/if}

		<div class="w-full rounded-2xl border border-pink-100 bg-white/80 p-4 text-left shadow-sm">
			<form
				class="space-y-3"
				on:submit|preventDefault={() =>
					importPassport(passportCode || manualCode, vaultServerUrl, Boolean(vaultServerUrl))}
			>
				{#if !passportCode}
					<label class="block">
						<span class="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
							Your code
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

				<div class="grid gap-2 {passportCode && vaultServerUrl ? 'sm:grid-cols-2' : ''}">
					<button
						type="submit"
						class="btn min-h-12 border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600 disabled:opacity-60"
						disabled={Boolean(passportCode) || status === 'importing' || status === 'getting'}
					>
						{passportCode ? 'Ghost remembers you' : 'Wake the ghost'}
					</button>
					{#if passportCode && vaultServerUrl}
						<button
							type="button"
							class="btn min-h-12 border-pink-100 bg-white text-pink-600 transition-colors duration-150 hover:border-pink-200 hover:bg-pink-50 disabled:opacity-60"
							on:click={getNotes}
							disabled={status === 'getting'}
						>
							{status === 'getting' ? 'Fetching...' : 'Fetch my notes'}
						</button>
					{/if}
				</div>
			</form>

			{#if errorMessage}
				<p class="mt-3 text-sm font-bold text-amber-700" aria-live="polite">
					{errorMessage}
				</p>
			{/if}

			{#if restoreSummary && restoreSummary.action === 'pulled'}
				<p class="mt-3 text-sm font-bold text-emerald-700" aria-live="polite">
					Your notes followed you here.
				</p>
			{/if}
		</div>

		<a
			href="/"
			class="btn min-h-12 w-full rounded-2xl border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600"
		>
			Back to TalkType
		</a>
	</section>

	{#if showConfetti}
		<Confetti on:complete={() => (showConfetti = false)} />
	{/if}
</main>
