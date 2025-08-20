<script>
	import '../app.css';
	import ModelDownloadIndicator from '$lib/components/whisper/ModelDownloadIndicator.svelte';

	let { children } = $props();
</script>

<ModelDownloadIndicator />
{@render children()}
