<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let { children } = $props();
	
	// Register the service worker for PWA functionality
	onMount(() => {
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js')
				.then(registration => {
					console.log('🎭 TalkType: Service Worker registered successfully');
				})
				.catch(error => {
					console.error('🎭 TalkType: Service Worker registration failed:', error);
				});
		}
	});
</script>

{@render children()}
