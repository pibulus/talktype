<script>
	import { onMount, onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { ANIMATION } from '$lib/constants';

	const ICONS = {
		info: 'M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z',
		success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
		error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
	};

	// Warm pastel families to match the app's peach/mint/rose language —
	// not the cool corporate blue/emerald defaults.
	const TYPE_COLORS = {
		info: {
			bg: 'bg-amber-50',
			border: 'border-amber-200',
			text: 'text-amber-900',
			icon: 'text-amber-500'
		},
		success: {
			bg: 'bg-emerald-50',
			border: 'border-emerald-200',
			text: 'text-emerald-900',
			icon: 'text-emerald-500'
		},
		error: {
			bg: 'bg-rose-50',
			border: 'border-rose-200',
			text: 'text-rose-900',
			icon: 'text-rose-500'
		}
	};

	let toasts = [];
	let toastId = 0;

	function addToast(detail) {
		const id = ++toastId;
		// Coerce unknown types to 'info' so one malformed event can't break
		// TYPE_COLORS lookups for every toast on screen.
		const type = TYPE_COLORS[detail?.type] ? detail.type : 'info';
		const message = detail?.message || '';
		const duration =
			type === 'error' ? ANIMATION.TOAST.ERROR_DURATION : ANIMATION.TOAST.DISPLAY_DURATION;

		toasts = [...toasts, { id, message, type }];

		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, duration);

		return id;
	}

	function handleToast(event) {
		if (event?.detail) {
			addToast(event.detail);
		}
	}

	onMount(() => {
		window.addEventListener('talktype:toast', handleToast);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('talktype:toast', handleToast);
		}
	});
</script>

{#if toasts.length > 0}
	<div class="toast-container" role="status" aria-live="polite">
		{#each toasts as toast (toast.id)}
			<div
				class="toast-item {TYPE_COLORS[toast.type].bg} {TYPE_COLORS[toast.type]
					.border} {TYPE_COLORS[toast.type].text}"
				transition:fly={{ y: 24, duration: 260, easing: quintOut }}
			>
				<svg
					class="toast-icon {TYPE_COLORS[toast.type].icon}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d={ICONS[toast.type] || ICONS.info} />
				</svg>
				<span class="toast-message">{toast.message}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		/* Same safe-area math as PageLayout's footer clearance — a hardcoded
		   offset sits inconsistently across notch/no-notch devices. */
		bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
		width: 100%;
		max-width: 28rem;
		padding: 0 1rem;
	}

	.toast-item {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.1rem;
		border-radius: 1rem;
		border: 2px solid;
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: 0;
		box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
		max-width: 100%;
	}

	.toast-icon {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.toast-message {
		line-height: 1.3;
	}
</style>
