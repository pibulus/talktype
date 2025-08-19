<script>
	import { AppSuffix } from '$lib/components/ui';

	// Example branding schemes
	const brands = [
		{
			name: 'TalkType',
			color: 'inherit',
			size: '65%'
		},
		{
			name: 'SnipSite',
			color: '#4338ca',
			size: '65%'
		},
		{
			name: 'WordFlow',
			color: '#0891b2',
			size: '65%'
		},
		{
			name: 'CodeScribe',
			color: '#059669',
			size: '65%'
		}
	];
</script>

<div class="mx-auto max-w-3xl p-8">
	<h1 class="mb-8 text-3xl font-bold">UI Component: .app Suffix</h1>

	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="rounded-lg bg-white p-6 shadow-md">
			<h3 class="text-4xl font-bold">
				TalkType<AppSuffix />
			</h3>
			<p class="text-gray-600">Default suffix with no customization</p>

			<pre class="mt-4 overflow-x-auto rounded bg-gray-100 p-3 text-sm">
&lt;h1 class="text-4xl font-bold"&gt;
  TalkType&lt;AppSuffix /&gt;
&lt;/h1&gt;</pre>
		</div>
	</section>

	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold">Brand-Specific Styling</h2>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each brands as brand}
				<div class="rounded-lg bg-white p-6 shadow-md">
					<h3
						class="text-3xl font-bold"
						style="color: {brand.color === 'inherit' ? 'inherit' : brand.color};"
					>
						{brand.name}<AppSuffix color={brand.color} size={brand.size} />
					</h3>
					<p class="mt-2 text-gray-600">Integrated with {brand.name} branding</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold">Size Variations</h2>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="text-3xl font-bold">
					Small<AppSuffix size="50%" />
				</h3>
				<p class="mt-2 text-gray-600">size="50%"</p>
			</div>
			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="text-3xl font-bold">
					Medium<AppSuffix size="65%" />
				</h3>
				<p class="mt-2 text-gray-600">size="65%" (recommended)</p>
			</div>
			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="text-3xl font-bold">
					Large<AppSuffix size="75%" />
				</h3>
				<p class="mt-2 text-gray-600">size="75%"</p>
			</div>
		</div>
	</section>

	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold">Integration Examples</h2>

		<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
			<h3 class="mb-3 text-lg font-semibold">In Heading</h3>
			<div class="rounded border border-gray-200 p-4">
				<h2 class="text-3xl font-bold">
					TalkType<AppSuffix />
				</h2>
				<p class="mt-2">Voice-to-text that doesn't suck. Spooky good, freaky fast, always free.</p>
			</div>
		</div>

		<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
			<h3 class="mb-3 text-lg font-semibold">In Navigation</h3>
			<div class="rounded border border-gray-200 p-4">
				<nav class="flex items-center space-x-6">
					<div class="text-lg font-bold">TalkType<AppSuffix size="60%" /></div>
					<button type="button" class="text-gray-600 hover:text-gray-900">Features</button>
					<button type="button" class="text-gray-600 hover:text-gray-900">Pricing</button>
					<button type="button" class="text-gray-600 hover:text-gray-900">About</button>
				</nav>
			</div>
		</div>

		<div class="rounded-lg bg-white p-6 shadow-md">
			<h3 class="mb-3 text-lg font-semibold">In Footer</h3>
			<div class="rounded border border-gray-200 p-4">
				<footer class="text-sm text-gray-500">
					© 2025 TalkType<AppSuffix size="60%" /> — All rights reserved.
				</footer>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-4 text-xl font-semibold">Implementation Notes</h2>
		<div class="prose max-w-none rounded-lg bg-white p-6 shadow-md">
			<h3>Design Principles</h3>
			<ul>
				<li>
					<strong>Brand Completion</strong> — The suffix is a natural continuation of the product name
				</li>
				<li>
					<strong>Visual Cohesion</strong> — It uses the same font and styling as the main wordmark
				</li>
				<li>
					<strong>Unifying Element</strong> — Acts as a common identifier across the Soft Stack ecosystem
				</li>
			</ul>

			<h3 class="mt-6">Usage Guidelines</h3>
			<ul>
				<li>Always use lowercase ".app" for consistency</li>
				<li>Use the same font as the main wordmark</li>
				<li>Use 65-70% size relative to the main wordmark</li>
				<li>Match the font weight to the main wordmark (usually 600)</li>
				<li>Position it inline with the main text, not as a separate element</li>
				<li>Ensure it inherits all typographic styles from the main wordmark</li>
			</ul>
		</div>
	</section>
</div>
