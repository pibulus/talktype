<script>
	import { onDestroy, onMount } from 'svelte';
	import { Seo } from '$lib/components/layout';

	let status = 'Ready for a fresh local cache';
	let cleared = false;
	let reloadTimeout;

	async function clearAllCaches() {
		status = 'Clearing local caches...';
		cleared = false;

		try {
			// Clear IndexedDB
			const databases = (await indexedDB.databases?.()) || [];
			for (const db of databases) {
				if (db.name) {
					await indexedDB.deleteDatabase(db.name);
					console.log(`Deleted IndexedDB: ${db.name}`);
				}
			}

			// Fallback for browsers that don't support databases()
			const commonDBNames = [
				'transformers-cache',
				'transformers-models',
				'transformersjs',
				'model-cache',
				'onnx-models'
			];

			for (const name of commonDBNames) {
				try {
					await indexedDB.deleteDatabase(name);
					console.log(`Attempted to delete IndexedDB: ${name}`);
				} catch {
					// Ignore if doesn't exist
				}
			}

			// Clear Cache Storage
			if ('caches' in window) {
				const names = await caches.keys();
				await Promise.all(names.map((name) => caches.delete(name)));
				console.log(`Cleared ${names.length} cache storage entries`);
			}

			// Clear localStorage
			localStorage.clear();
			console.log('Cleared localStorage');

			// Clear sessionStorage
			sessionStorage.clear();
			console.log('Cleared sessionStorage');

			status = 'Local caches are fresh now.';
			cleared = true;

			// Reload after 2 seconds
			if (reloadTimeout) {
				clearTimeout(reloadTimeout);
			}
			reloadTimeout = setTimeout(() => {
				status = 'Reloading TalkType...';
				window.location.reload();
			}, 2000);
		} catch (error) {
			status = `Cache refresh needs one more try: ${error.message}`;
			console.error('Cache clearing error:', error);
		}
	}

	onMount(() => {
		console.log('Cache cleaner ready');
	});

	onDestroy(() => {
		if (reloadTimeout) {
			clearTimeout(reloadTimeout);
		}
	});
</script>

<Seo
	title="Clear Model Cache | TalkType"
	description="Clear TalkType local model and browser caches."
	path="/clear-cache"
	noindex={true}
	includeStructuredData={false}
/>

<div class="min-h-screen bg-gradient-to-br from-[#fffaef] to-[#fff0d9] p-8 text-gray-800">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-8 text-4xl font-black tracking-tight">Refresh Local Cache</h1>

		<div class="rounded-3xl border border-pink-100 bg-white/75 p-6 shadow-xl backdrop-blur-md">
			<p class="mb-6 text-gray-600">
				This clears the cached offline model and browser storage so TalkType can fetch a fresh
				local copy the next time Offline Mode is used.
			</p>

			<button
				on:click={clearAllCaches}
				disabled={cleared}
				class="w-full rounded-full bg-pink-500 px-6 py-3 font-bold text-white hover:bg-pink-600 disabled:bg-gray-300"
			>
				{cleared ? 'Cache refreshed' : 'Refresh Local Cache'}
			</button>

			<div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
				<p class="text-amber-900">Status: {status}</p>
			</div>

			<div class="mt-6 text-sm text-gray-600">
				<h3 class="mb-2 font-bold">This will clear:</h3>
				<ul class="list-inside list-disc">
					<li>IndexedDB (cached models)</li>
					<li>Cache Storage</li>
					<li>localStorage</li>
					<li>sessionStorage</li>
				</ul>
			</div>
		</div>
	</div>
</div>
