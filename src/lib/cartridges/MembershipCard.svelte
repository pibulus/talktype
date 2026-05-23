<script>
	import { generateMemberIdentity } from './identityUtils.js';

	export let vaultHash = '';

	$: identity = generateMemberIdentity(vaultHash);
	$: hasVaultHash = !identity.isFallback;
	$: cardStyle = `--passport-bg: #${identity.bg}; --passport-shape: #${identity.shape};`;
</script>

<div
	class="passport-card relative flex aspect-[1.586/1] w-full max-w-[320px] flex-col justify-between overflow-hidden rounded-2xl border border-[#fffdf0]/80 p-5 text-gray-900"
	class:is-placeholder={!hasVaultHash}
	style={cardStyle}
	role="group"
	aria-label={hasVaultHash
		? `TalkType supporter passport for ${identity.name}`
		: 'TalkType supporter passport placeholder'}
>
	<div class="passport-glow pointer-events-none absolute inset-0"></div>
	<div class="passport-pattern pointer-events-none absolute right-0 top-0 h-full w-24"></div>

	<div class="relative z-10 flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h3 class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-600">
				TalkType Passport
			</h3>
			<p class="passport-name mt-1 max-w-[190px] font-black">
				{identity.name}
			</p>
		</div>

		<div
			class="initials-chip grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-black text-gray-800"
			aria-hidden="true"
		>
			{identity.initials}
		</div>
	</div>

	<div class="relative z-10 flex items-end justify-between gap-4">
		<div class="min-w-0">
			<p class="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">Supporter ID</p>
			<p class="mt-1 font-mono text-sm font-black tracking-normal">{identity.memberId}</p>
		</div>

		<div
			class="ghost-seal grid h-12 w-12 shrink-0 place-items-center rounded-full"
			aria-hidden="true"
		>
			<svg class="ghost-mark" viewBox="0 0 32 36" focusable="false" aria-hidden="true">
				<path
					d="M16 3c-7.1 0-12 5.4-12 13.1V32l3.5-2.2L11 32l3.5-2.2L18 32l3.5-2.2L25 32l3-1.9v-14C28 8.4 23.1 3 16 3Z"
				/>
				<circle cx="11.5" cy="16" r="2.4" />
				<circle cx="20.5" cy="16" r="2.4" />
			</svg>
		</div>
	</div>
</div>

<style>
	.passport-card {
		background:
			linear-gradient(135deg, rgba(255, 253, 240, 0.78), rgba(255, 253, 240, 0.2)),
			linear-gradient(135deg, var(--passport-bg), #fff8e7);
		box-shadow:
			0 18px 34px rgba(136, 82, 88, 0.18),
			0 3px 0 rgba(255, 253, 240, 0.9) inset,
			0 0 0 1px rgba(136, 82, 88, 0.08);
		transform-origin: center;
	}

	.passport-card.is-placeholder {
		border-style: dashed;
		box-shadow: 0 14px 32px rgba(79, 70, 68, 0.08);
	}

	.passport-glow {
		background: linear-gradient(
			115deg,
			transparent 0%,
			rgba(255, 253, 240, 0.5) 46%,
			transparent 72%
		);
		mix-blend-mode: overlay;
		opacity: 0.34;
	}

	.passport-pattern {
		background: repeating-linear-gradient(
			135deg,
			var(--passport-shape) 0 4px,
			rgba(255, 253, 240, 0.52) 4px 8px,
			rgba(255, 253, 240, 0.16) 8px 12px
		);
		clip-path: polygon(28% 0, 100% 0, 100% 100%, 0 100%);
		opacity: 0.74;
	}

	.passport-card.is-placeholder .passport-pattern {
		opacity: 0.24;
	}

	.passport-name {
		font-size: 1.48rem;
		line-height: 1.08;
		overflow-wrap: break-word;
		text-shadow: 0 1px 0 rgba(255, 253, 240, 0.62);
		text-wrap: balance;
	}

	.initials-chip {
		background: rgba(255, 253, 240, 0.86);
		background: color-mix(in srgb, var(--passport-shape) 24%, #fffdf0 76%);
		border: 1px solid rgba(255, 253, 240, 0.88);
		box-shadow:
			0 8px 18px rgba(136, 82, 88, 0.12),
			inset 0 1px 0 rgba(255, 253, 240, 0.72);
	}

	.ghost-seal {
		background: rgba(255, 253, 240, 0.62);
		border: 1px solid rgba(255, 253, 240, 0.78);
		box-shadow: 0 6px 14px rgba(79, 70, 68, 0.1);
	}

	.ghost-mark {
		width: 32px;
		height: 36px;
		fill: rgba(255, 253, 240, 0.95);
		filter: drop-shadow(0 3px 0 rgba(255, 202, 212, 0.45));
	}

	.ghost-mark circle {
		fill: #374151;
	}

	@media (max-width: 360px) {
		.passport-card {
			padding: 1rem;
		}

		.passport-name {
			font-size: 1.3rem;
			line-height: 1.12;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.passport-card {
			animation: passportReveal 420ms cubic-bezier(0.2, 0.9, 0.2, 1.12) both;
		}
	}

	@keyframes passportReveal {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.94) rotate(-1deg);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1) rotate(0);
		}
	}
</style>
