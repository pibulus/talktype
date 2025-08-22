<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { pwaService, deferredInstallPrompt, isPwaInstalled } from '../../services/pwa';
	
	let installAvailable = false;
	let isInstalled = false;
	let installPrompt = null;
	
	onMount(() => {
		if (!browser) return;
		
		// Check if already installed
		const unsubInstalled = isPwaInstalled.subscribe(value => {
			isInstalled = value;
		});
		
		// Check if install prompt is available
		const unsubPrompt = deferredInstallPrompt.subscribe(value => {
			installPrompt = value;
			installAvailable = !!value && !isInstalled;
		});
		
		return () => {
			unsubInstalled();
			unsubPrompt();
		};
	});
	
	async function installPwa() {
		if (!installPrompt) return;
		
		try {
			// Show the install prompt
			installPrompt.prompt();
			
			// Wait for the user to respond
			const { outcome } = await installPrompt.userChoice;
			
			if (outcome === 'accepted') {
				console.log('PWA installed successfully');
				installAvailable = false;
			}
		} catch (error) {
			console.error('Error installing PWA:', error);
		}
	}
	
	function showInstructions() {
		// Show platform-specific instructions
		const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
		const isAndroid = /Android/.test(navigator.userAgent);
		
		if (isIOS) {
			alert('To install on iOS:\n1. Tap the Share button (↗)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
		} else if (isAndroid) {
			alert('To install on Android:\n1. Tap the menu button (⋮)\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
		} else {
			alert('Look for the install icon in your browser\'s address bar or menu');
		}
	}
</script>

<div class="space-y-2 rounded-lg border border-blue-100/60 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 p-3 shadow-sm">
	<h4 class="flex items-center justify-between text-sm font-bold text-gray-700">
		<span>📱 Install as App</span>
		{#if isInstalled}
			<span class="badge badge-sm border-green-200 bg-green-100 text-green-700">
				Installed
			</span>
		{/if}
	</h4>
	
	<div class="space-y-2 pt-1">
		{#if isInstalled}
			<p class="text-xs text-gray-600">
				✅ TalkType is installed on your device! Access it from your home screen anytime.
			</p>
		{:else if installAvailable}
			<p class="text-xs text-gray-600 mb-2">
				Install TalkType for instant access, offline use, and a full-screen experience.
			</p>
			<button
				on:click={installPwa}
				class="w-full rounded-lg bg-gradient-to-r from-blue-400 to-cyan-400 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:from-blue-500 hover:to-cyan-500 active:scale-[0.98]"
			>
				Install TalkType Now
			</button>
		{:else}
			<p class="text-xs text-gray-600 mb-2">
				Make TalkType feel like a native app on your device.
			</p>
			<button
				on:click={showInstructions}
				class="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-50 active:scale-[0.98]"
			>
				Show Install Instructions
			</button>
		{/if}
		
		<div class="text-xs text-gray-500 mt-2">
			<strong>Benefits:</strong> Works offline • Launches instantly • Full-screen mode
		</div>
	</div>
</div>