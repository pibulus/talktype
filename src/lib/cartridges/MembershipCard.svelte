<script>
	import { generateMemberIdentity } from './identityUtils.js';

	export let vaultHash = '';

	$: identity = generateMemberIdentity(vaultHash);
	$: cardStyle = `--passport-bg: #${identity.bg}; --passport-shape: #${identity.shape};`;
</script>

<div
	class="passport-card relative flex aspect-[1.586/1] w-full max-w-[320px] flex-col justify-between overflow-hidden rounded-2xl border border-white/70 p-5 text-gray-900 shadow-2xl"
	style={cardStyle}
	role="group"
	aria-label={`TalkType supporter passport for ${identity.name}`}
>
	<div class="passport-glow pointer-events-none absolute inset-0"></div>
	<div class="passport-pattern pointer-events-none absolute right-0 top-0 h-full w-24"></div>

	<div class="relative z-10 flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h3 class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-600">
				TalkType Passport
			</h3>
			<p class="mt-1 max-w-[196px] text-[1.32rem] font-black leading-[1.05]">
				{identity.name}
			</p>
		</div>

		<div
			class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/70 bg-white/50 font-black text-gray-800 shadow-sm"
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
			<span class="ghost-mark"></span>
		</div>
	</div>
</div>

<style>
	.passport-card {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.2)),
			linear-gradient(135deg, var(--passport-bg), #fff8e7);
		transform-origin: center;
	}

	.passport-glow {
		background: linear-gradient(
			115deg,
			transparent 0%,
			rgba(255, 255, 255, 0.42) 46%,
			transparent 72%
		);
		mix-blend-mode: soft-light;
	}

	.passport-pattern {
		background: repeating-linear-gradient(
			135deg,
			var(--passport-shape) 0 4px,
			rgba(255, 255, 255, 0.42) 4px 8px,
			rgba(255, 255, 255, 0.08) 8px 12px
		);
		clip-path: polygon(28% 0, 100% 0, 100% 100%, 0 100%);
		opacity: 0.58;
	}

	.ghost-seal {
		background: rgba(255, 255, 255, 0.58);
		border: 1px solid rgba(255, 255, 255, 0.76);
		box-shadow: 0 6px 14px rgba(79, 70, 68, 0.1);
	}

	.ghost-mark {
		position: relative;
		display: block;
		width: 22px;
		height: 27px;
		border-radius: 12px 12px 7px 7px;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: inset 0 -5px 0 rgba(255, 202, 212, 0.5);
	}

	.ghost-mark::before {
		content: '';
		position: absolute;
		left: 6px;
		top: 9px;
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: #374151;
		box-shadow: 8px 0 0 #374151;
	}

	.ghost-mark::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 6px;
		background: radial-gradient(circle at 4px 0, transparent 0 4px, rgba(255, 255, 255, 0.92) 4px);
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
