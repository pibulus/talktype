<script context="module">
	// ═══════════════════════════════════════════════════════════════════
	// 🫀 FooterCharm — SoftStack charms golden source (vendored per app)
	// ═══════════════════════════════════════════════════════════════════
	// The little living creature in the footer. Picks ONE charm from the
	// app's pool per page-load (random + modular — every visit a tiny
	// surprise), beats like a real heart, and pops a mini-burst of itself
	// when tapped. Never nags, never blocks, honors reduced motion.
	//
	// WIRING (one line where the static emoji span used to be):
	//   <FooterCharm charms={['❤️', '☕', '👻']} label="love" />
</script>

<script>
	import { onMount } from 'svelte';

	/** The app's charm pool — one is chosen at random each page-load. */
	export let charms = ['❤️'];
	/** Lucky pulls — a rare surprise instead of the usual pool. */
	export let rare = ['🌮'];
	export let rareChance = 0.08;
	/** Per-app word overrides; merged over the built-in map below. */
	export let labels = {};

	// What the footer sentence says to screen readers: "Made with ___ in
	// Melbourne" should be as alive read aloud as it looks.
	const WORDS = {
		'❤️': 'love',
		'💜': 'love',
		'☕': 'coffee',
		'👻': 'a friendly ghost',
		'📖': 'a good book',
		'🌙': 'moonlight',
		'🍒': 'cherries',
		'⚡': 'lightning',
		'🌮': 'tacos'
	};

	// SSR renders the first charm; the random pick happens client-side so
	// server and first client paint never disagree.
	let charm = charms[0];
	let bursts = [];
	let nextId = 0;

	$: label = labels[charm] ?? WORDS[charm] ?? 'love';

	onMount(() => {
		charm =
			rare.length && Math.random() < rareChance
				? rare[Math.floor(Math.random() * rare.length)]
				: charms[Math.floor(Math.random() * charms.length)];
	});

	function pop() {
		const litter = Array.from({ length: 5 }, (_, i) => ({
			id: nextId++,
			dx: Math.round((Math.random() * 2 - 1) * 28),
			delay: i * 70
		}));
		bursts = [...bursts, ...litter];
		const ids = litter.map((b) => b.id);
		setTimeout(() => {
			bursts = bursts.filter((b) => !ids.includes(b.id));
		}, 1800);
	}
</script>

<button type="button" class="footer-charm" aria-label={label} on:click={pop}>
	<span class="charm-beat" aria-hidden="true">{charm}</span>
	{#each bursts as b (b.id)}
		<span
			class="charm-float"
			style="--dx: {b.dx}px; animation-delay: {b.delay}ms"
			aria-hidden="true">{charm}</span
		>
	{/each}
</button>

<style>
	.footer-charm {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.15rem;
		background: none;
		border: none;
		cursor: pointer;
		line-height: 1;
		font-size: inherit;
		-webkit-tap-highlight-color: transparent;
		transition: transform 0.22s linear(0, 0.5 15%, 1.15 40%, 0.97 65%, 1);
	}
	.footer-charm:hover {
		transform: scale(1.25);
	}
	.footer-charm:active {
		transform: scale(0.85);
	}

	/* thump-thump… rest — a real heartbeat, not an opacity fade */
	.charm-beat {
		display: inline-block;
		animation: charm-heartbeat 1.8s ease-in-out infinite;
	}
	@keyframes charm-heartbeat {
		0%,
		32%,
		100% {
			transform: scale(1);
		}
		8% {
			transform: scale(1.22);
		}
		16% {
			transform: scale(1.02);
		}
		24% {
			transform: scale(1.16);
		}
	}

	.charm-float {
		position: absolute;
		left: 50%;
		top: 0;
		pointer-events: none;
		font-size: 0.7em;
		opacity: 0;
		animation: charm-float 1.15s ease-out forwards;
	}
	@keyframes charm-float {
		0% {
			opacity: 0.95;
			transform: translate(-50%, 0) scale(0.7);
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--dx)), -2.2em) scale(1.2);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.charm-beat {
			animation: none;
		}
		.charm-float {
			animation: none;
			opacity: 0;
		}
		.footer-charm:hover,
		.footer-charm:active {
			transform: none;
		}
	}
</style>
