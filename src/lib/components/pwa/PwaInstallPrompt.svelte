<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { pwaService } from '$lib/services/pwa';
	import { ModalCloseButton } from '../modals/index.js';

	// Event dispatcher to communicate with parent components
	const dispatch = createEventDispatcher();

	// Props
	export let installPromptEvent = null; // BeforeInstallPrompt event
	export let variant = 'default'; // Styling variant: default, mini, or corner

	// Component state
	let platformSpecificInstructions = '';
	let showPlatformInstructions = false;
	let platform = 'unknown';
	let isIOS = false;
	let isAndroid = false;
	let isChrome = false;
	let isSafari = false;
	let isFirefox = false;
	let isEdge = false;

	onMount(() => {
		if (!browser) return;

		// Record that we've shown the prompt to the user
		pwaService.recordPromptShown();

		// Detect platform and browser
		detectPlatform();

		// Set platform-specific instructions
		setPlatformInstructions();
	});

	/**
	 * Detects the user's platform and browser
	 */
	function detectPlatform() {
		if (!browser) return;

		const ua = navigator.userAgent.toLowerCase();

		// Detect OS
		isIOS =
			/iphone|ipad|ipod/.test(ua) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // Modern iPads
		isAndroid = /android/.test(ua);

		// Detect Browser
		isChrome = /chrome|chromium|crios/.test(ua) && !/edg/.test(ua);
		isSafari = /safari/.test(ua) && !isChrome; // Safari has "Safari" but Chrome also includes it
		isFirefox = /firefox|fxios/.test(ua);
		isEdge = /edg/.test(ua);

		// Set platform name for UI usage
		if (isIOS) {
			platform = 'iOS';
		} else if (isAndroid) {
			platform = 'Android';
		} else {
			platform = navigator.platform || 'desktop';
		}
	}

	/**
	 * Sets platform-specific installation instructions
	 */
	function setPlatformInstructions() {
		if (isIOS && isSafari) {
			platformSpecificInstructions =
				'Tap the share button in Safari, then select "Add to Home Screen"';
		} else if (isAndroid && isChrome) {
			platformSpecificInstructions =
				'Tap the menu button in Chrome, then select "Add to Home Screen"';
		} else if (isFirefox) {
			platformSpecificInstructions =
				'Tap the menu button in Firefox, then select "Add to Home Screen"';
		} else if (isEdge) {
			platformSpecificInstructions =
				'Tap the menu button in Edge, then select "Add to Home Screen"';
		} else {
			platformSpecificInstructions =
				"Use your browser's menu to install this app to your home screen";
		}
	}

	/**
	 * Handles the installation button click.
	 * Shows the native installation prompt if available.
	 */
	async function handleInstall() {
		// If we have the browser's install prompt, use it
		if (installPromptEvent) {
			try {
				// Show the native browser install prompt

				// This is a built-in browser API, not our custom UI
				const result = await installPromptEvent.prompt();

				// Wait for the user to respond to the prompt
				const choiceResult = await installPromptEvent.userChoice;

				if (choiceResult.outcome === 'accepted') {
					pwaService.markAsInstalled();
					close();
				} else {
				}

				// Clear the saved prompt since it can only be used once
				installPromptEvent = null;
			} catch (error) {
				console.error('Error showing install prompt:', error);
				// Show platform specific instructions as fallback
				showPlatformInstructions = true;
			}
		} else {
			// No install prompt available, show manual instructions
			showPlatformInstructions = true;
		}
	}

	/**
	 * Closes the installation prompt
	 */
	function close() {
		dispatch('closeprompt');
	}
</script>

<div class="pwa-install-prompt {variant}" role="dialog" aria-labelledby="pwa-prompt-title">
	<div class="prompt-content">
		<!-- Close button -->
		<ModalCloseButton
			closeModal={close}
			label="Close installation prompt"
			position="right-3 top-3"
			size="sm"
			modalId="pwa_install_prompt"
		/>

		<!-- App icon and title -->
		<div class="prompt-header">
			<div class="app-icon">
				<img src="/icons/icon-192x192.png" alt="TalkType" width="48" height="48" />
			</div>
			<div class="app-info">
				<h2 id="pwa-prompt-title">Install TalkType</h2>
				<p class="tagline">Voice-to-text that doesn't suck</p>
			</div>
		</div>

		<!-- Prompt description -->
		<div class="prompt-description">
			{#if showPlatformInstructions}
				<p>Installation instructions for {platform}:</p>
				<div class="platform-instructions">
					<p>{platformSpecificInstructions}</p>

					<!-- iOS Safari specific visuals -->
					{#if isIOS && isSafari}
						<div class="ios-instructions">
							<div class="ios-step">
								<div class="ios-icon">1️⃣</div>
								<span>Tap <span class="ios-share-icon">⬆️</span> below</span>
							</div>
							<div class="ios-step">
								<div class="ios-icon">2️⃣</div>
								<span>Scroll and tap <b>Add to Home Screen</b></span>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<p>Add TalkType to your home screen for:</p>
				<ul class="benefits-list">
					<li>Faster loading</li>
					<li>Full-screen experience</li>
					<li>Offline support</li>
				</ul>
			{/if}
		</div>

		<!-- Installation button -->
		{#if !showPlatformInstructions}
			<button type="button" class="install-button" on:click={handleInstall}>
				Install TalkType
			</button>
		{:else}
			<button type="button" class="install-button ghost" on:click={close}> Got it </button>
		{/if}
	</div>
</div>

<style>
	.pwa-install-prompt {
		position: fixed;
		bottom: 20px;
		right: 20px;
		width: 320px;
		background: white;
		border-radius: 12px;
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.15),
			0 0 1px rgba(0, 0, 0, 0.1),
			0 0 0 1px rgba(249, 168, 212, 0.3);
		z-index: 1000;
		overflow: hidden;
		animation: slideIn 0.3s cubic-bezier(0.25, 1, 0.5, 1);
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	/* Variant styles */
	.pwa-install-prompt.mini {
		width: 280px;
		bottom: 16px;
		right: 16px;
	}

	.pwa-install-prompt.corner {
		width: 280px;
		bottom: 20px;
		left: 20px;
	}

	.prompt-content {
		padding: 16px;
	}

	.prompt-header {
		display: flex;
		align-items: center;
		margin-bottom: 12px;
	}

	.app-icon {
		width: 48px;
		height: 48px;
		margin-right: 12px;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.app-icon img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.app-info h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #333;
	}

	.tagline {
		margin: 2px 0 0;
		font-size: 14px;
		color: #666;
	}

	.prompt-description {
		margin: 12px 0;
	}

	.prompt-description p {
		margin: 0 0 8px;
		font-size: 14px;
		color: #444;
	}

	.benefits-list {
		margin: 8px 0;
		padding-left: 24px;
	}

	.benefits-list li {
		margin-bottom: 4px;
		font-size: 14px;
		color: #555;
	}

	.install-button {
		width: 100%;
		padding: 12px;
		background: linear-gradient(to right, #ff9cef, #fbbf24);
		border: none;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 6px rgba(251, 191, 36, 0.3);
	}

	.install-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
	}

	.install-button:active {
		transform: translateY(1px);
		box-shadow: 0 1px 3px rgba(251, 191, 36, 0.4);
	}

	.install-button.ghost {
		background: #f5f5f5;
		color: #333;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.platform-instructions {
		background: #f9f9f9;
		border-radius: 8px;
		padding: 12px;
		margin: 8px 0;
		font-size: 14px;
		color: #444;
	}

	.ios-instructions {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ios-step {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.ios-icon {
		font-size: 16px;
	}

	.ios-share-icon {
		font-size: 16px;
		background: #f0f0f0;
		padding: 2px 6px;
		border-radius: 4px;
	}

	@keyframes slideIn {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@media (max-width: 480px) {
		.pwa-install-prompt {
			width: calc(100% - 40px);
			max-width: 360px;
			margin: 0 auto;
			left: 0;
			right: 0;
			bottom: 16px;
		}

		.pwa-install-prompt.corner {
			left: 16px;
			right: auto;
		}
	}
</style>
