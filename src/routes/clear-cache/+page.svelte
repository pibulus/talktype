<script>
	import { onMount } from 'svelte';

	let status = 'Ready to clear cache';
	let cleared = false;

	async function clearAllCaches() {
		status = 'Clearing caches...';
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
				} catch (e) {
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

			status = '✅ All caches cleared successfully!';
			cleared = true;

			// Reload after 2 seconds
			setTimeout(() => {
				status = 'Reloading page...';
				window.location.reload();
			}, 2000);
		} catch (error) {
			status = `❌ Error: ${error.message}`;
			console.error('Cache clearing error:', error);
		}
	}

	onMount(() => {
		console.log('Cache cleaner ready');
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 p-8">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-8 text-4xl font-bold text-white">🗑️ Clear Model Cache</h1>

		<div class="rounded-xl bg-white/20 p-6 backdrop-blur-md">
			<p class="mb-6 text-white">
				This will clear all cached Whisper models and force fresh downloads. Use this if you're
				experiencing ONNX errors or corrupted models.
			</p>

			<button
				on:click={clearAllCaches}
				disabled={cleared}
				class="w-full rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:bg-gray-500"
			>
				{cleared ? '✅ Cleared!' : '🗑️ Clear All Caches'}
			</button>

			<div class="mt-4 rounded-lg bg-black/30 p-4">
				<p class="text-white">Status: {status}</p>
			</div>

			<div class="mt-6 text-sm text-white/80">
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
