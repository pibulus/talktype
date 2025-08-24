<script>
	import { GRADIENT_DEFS } from './gradients.js';
</script>

<!-- SVG Gradient Definitions - Reusable across all ghost instances -->
{#each Object.values(GRADIENT_DEFS) as gradient}
	<linearGradient id={gradient.id} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
		{#each gradient.stops as stop}
			<stop offset={stop.offset} stop-color={stop.color} />
		{/each}
	</linearGradient>
{/each}