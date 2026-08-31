<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	onMount(() => {
		if (browser) {
			const code = $page.params.code;
			if (code) {
				goto(`/?unlock=${encodeURIComponent(code)}`, { replaceState: true });
			} else {
				goto('/', { replaceState: true });
			}
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-[#fffdf5]">
	<p class="animate-pulse text-sm font-bold text-pink-500">Waking TalkType...</p>
</div>
