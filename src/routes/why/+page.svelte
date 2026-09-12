<script>
	import { absoluteUrl } from '$lib/config/seo.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';

	const canonicalUrl = 'https://talktype.app/why';
	const title = "Why We Don't Charge $144/year — The Sovereign Voice Manifesto | TalkType";
	const description =
		'Why pay $144/year to rent a speech-to-text API? TalkType is built on sovereign software principles: free forever with local browser AI, BYOK option, zero tracking, and designed for ADHD executive function.';

	// Assembled here, not inline in the head: eslint's Svelte parser cannot read
	// a <script> tag inside a template literal in markup, and the split closing tag
	// stops the real parser ending the block early. Same shape as Seo.svelte.
	const schemaMarkup =
		'<script type="application/ld+json">' +
		JSON.stringify({
			'@context': 'https://schema.org',
			'@graph': [
				{
					'@type': 'TechArticle',
					headline: "Why We Don't Charge $144/year — The Sovereign Voice Manifesto",
					url: canonicalUrl,
					image: absoluteUrl('/og-card.jpg'),
					description: description,
					inLanguage: 'en',
					author: {
						'@type': 'Person',
						name: 'Pablo',
						url: 'https://madebypablo.app'
					},
					publisher: {
						'@type': 'Organization',
						name: 'TalkType',
						url: 'https://talktype.app'
					}
				},
				{
					'@type': 'FAQPage',
					mainEntity: [
						{
							'@type': 'Question',
							name: 'Why do VC speech-to-text apps charge $12 to $15 per month?',
							acceptedAnswer: {
								'@type': 'Answer',
								text: 'Venture-backed apps (like Wispr Flow and Oasis) package simple speech APIs that cost $0.004 per minute, add a subscription tollgate, and charge $144 to $180 every year.'
							}
						},
						{
							'@type': 'Question',
							name: 'How does TalkType protect user privacy?',
							acceptedAnswer: {
								'@type': 'Answer',
								text: 'TalkType stores your voice notes strictly in your browser or local Mac keychain. It never sells your voice data or uses your thoughts to train commercial AI models.'
							}
						},
						{
							'@type': 'Question',
							name: 'How does the fast-brain dictation protocol help executive dysfunction?',
							acceptedAnswer: {
								'@type': 'Answer',
								text: 'It decouples thought generation from structuring. You speak your unfiltered stream of consciousness at 200 words per minute without worrying about punctuation, and the AI organizes the output into clear markdown notes.'
							}
						}
					]
				}
			]
		}).replace(/</g, '\\u003c') +
		'<' +
		'/script>';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="en" href={canonicalUrl} />
	<link rel="alternate" hreflang="es" href="https://talktype.app/es/por-que" />

	<!-- OpenGraph -->
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="TalkType" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={absoluteUrl('/og-card.jpg')} />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={absoluteUrl('/og-card.jpg')} />

	<!-- Structured Data -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- safe constant JSON-LD with escaped '<' -->
	{@html schemaMarkup}
</svelte:head>

<div
	class="flex min-h-screen flex-col justify-between bg-[#FAF8F5] font-sans text-[#1e1714] selection:bg-[#FFE5E5]"
>
	<!-- Top Navigation -->
	<nav
		class="sticky top-0 z-30 w-full border-b-4 border-black bg-[#FFE5EC] px-4 py-3 shadow-[0_4px_0_#000]"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-4">
			<a
				href="/"
				class="flex items-center gap-2 text-lg font-black tracking-tight transition-opacity hover:opacity-80 sm:text-xl"
			>
				<span class="text-2xl">👻</span>
				<span>TalkType</span>
				<span
					class="rounded-full bg-black px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[#FFE5EC]"
				>
					Manifesto & Guide
				</span>
			</a>

			<div class="flex items-center gap-3">
				<a
					href="/es/por-que"
					class="rounded-lg border-2 border-black bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_#000] transition-colors hover:bg-yellow-100"
				>
					🇲🇽 Español
				</a>
				<a
					href="/"
					class="rounded-lg bg-black px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0_#000] transition-colors hover:bg-gray-800"
				>
					Open Dictation 🎙️
				</a>
			</div>
		</div>
	</nav>

	<!-- Main Content Shell -->
	<main class="mx-auto max-w-3xl space-y-12 px-4 py-8 sm:py-12">
		<!-- Hero Header -->
		<header class="space-y-4 text-center">
			<div
				class="inline-block rounded-full border-2 border-black bg-[#E5F9FF] px-4 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000]"
			>
				⚡ Sovereign Software Manifesto 2026
			</div>
			<h1 class="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
				Why We Don’t Charge $144/year to Rent Your Own Voice
			</h1>
			<p class="mx-auto max-w-xl text-base leading-relaxed text-gray-700 sm:text-lg">
				The economics of speech-to-text, the death of subscription extortion, and the 3-step
				dictation protocol for ADHD and fast thinkers.
			</p>
		</header>

		<!-- SECTION 1: THE ECONOMICS EXPOSÉ -->
		<section
			class="space-y-6 rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0_#000] sm:p-8"
		>
			<div class="space-y-1">
				<div
					class="inline-block rounded-full border-2 border-black bg-yellow-100 px-3 py-0.5 text-xs font-black uppercase text-yellow-900"
				>
					💰 The Racket Exposed
				</div>
				<h2 class="text-2xl font-black tracking-tight sm:text-3xl">
					Speech APIs Cost Fractions of a Cent
				</h2>
			</div>

			<div class="space-y-4 text-sm leading-relaxed text-gray-800 sm:text-base">
				<p>
					Venture-backed transcription apps charge <strong>$12 to $15 every month</strong> ($144 to
					$180/year) for something that costs them approximately <strong>$0.004 per minute</strong> via
					models like Deepgram or local Whisper.
				</p>
				<p>
					If you speak for 10 minutes a day, the actual raw compute cost is about <strong
						>$1.20 per year</strong
					>. Charging $144 is a 12,000% markup designed to fund sales teams, venture dividends, and
					lock your cognitive output behind recurring tollgates.
				</p>
			</div>

			<!-- Comparison Table -->
			<div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
				<div class="space-y-2 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
					<div class="flex items-center gap-1.5 text-sm font-black text-red-900">
						<span>❌</span>
						<span>Venture Dictation Apps</span>
					</div>
					<ul class="list-inside list-disc space-y-1.5 text-xs text-gray-700">
						<li>$144 – $180/year forever</li>
						<li>Cancelling locks you out of your historical transcripts</li>
						<li>Audio and text fed into training datasets</li>
						<li>Corporate, sterile interfaces with blank-page pressure</li>
					</ul>
				</div>

				<div class="space-y-2 rounded-2xl border-2 border-green-400 bg-green-50 p-4">
					<div class="flex items-center gap-1.5 text-sm font-black text-green-900">
						<span>✅</span>
						<span>TalkType Sovereign Standard</span>
					</div>
					<ul class="list-inside list-disc space-y-1.5 text-xs text-gray-700">
						<li>Free unlimited daily web dictation</li>
						<li>Option to Bring Your Own API Key (zero markup)</li>
						<li>$49 Supporter Pass or $39 one-time Mac app (own it, don't rent it)</li>
						<li>Transcripts stored locally on your device with zero tracking</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- SECTION 2: THE FAST-BRAIN DICTATION PROTOCOL -->
		<section
			class="space-y-6 rounded-3xl border-4 border-black bg-[#FFF4E8] p-6 shadow-[8px_8px_0_#000] sm:p-8"
		>
			<div class="space-y-1">
				<div
					class="inline-block rounded-full border-2 border-black bg-purple-100 px-3 py-0.5 text-xs font-black uppercase text-purple-900"
				>
					🧠 Cognitive Ergonomics
				</div>
				<h2 class="text-2xl font-black tracking-tight sm:text-3xl">
					The 3-Step ADHD & Fast-Brain Protocol
				</h2>
			</div>

			<p class="text-sm leading-relaxed text-gray-800 sm:text-base">
				When you have a fast, non-linear brain, typing with your fingers is too slow. The gap
				between thought speed (250+ wpm) and typing speed (60 wpm) creates working memory
				bottlenecks and executive dysfunction paralysis.
			</p>

			<div class="space-y-4">
				<div
					class="space-y-1 rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_#000]"
				>
					<div class="flex items-center gap-2 text-sm font-black text-black">
						<span
							class="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white"
							>1</span
						>
						<span>The Raw Stream-of-Consciousness Dump</span>
					</div>
					<p class="text-xs leading-relaxed text-gray-700">
						Tap the bouncing ghost and speak whatever is in your head. Do NOT worry about grammar,
						full sentences, "ums", or chronological order. Speak at full conversational velocity.
					</p>
				</div>

				<div
					class="space-y-1 rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_#000]"
				>
					<div class="flex items-center gap-2 text-sm font-black text-black">
						<span
							class="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white"
							>2</span
						>
						<span>Automated Semantic Compression</span>
					</div>
					<p class="text-xs leading-relaxed text-gray-700">
						TalkType’s AI structuring cleans filler words, identifies key action items, and
						generates neat markdown bullet lists or polished prose depending on your style.
					</p>
				</div>

				<div
					class="space-y-1 rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_#000]"
				>
					<div class="flex items-center gap-2 text-sm font-black text-black">
						<span
							class="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white"
							>3</span
						>
						<span>1-Tap Dispersion (Zero Filing Anxiety)</span>
					</div>
					<p class="text-xs leading-relaxed text-gray-700">
						Don’t organize notes in complex nested folders you’ll never open again. Tap "Copy" and
						send it straight to Slack, an email draft, Obsidian, or your project tracker.
					</p>
				</div>
			</div>
		</section>

		<!-- SECTION 3: PRIVACY & DATA SOVEREIGNTY -->
		<section
			class="space-y-4 rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0_#000] sm:p-8"
		>
			<h2 class="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
				<span>🛡️</span>
				<span>Your Thoughts Are Not Training Data</span>
			</h2>
			<p class="text-sm leading-relaxed text-gray-800 sm:text-base">
				When you dictate personal journals, therapy notes, or sensitive business strategy, your
				audio should never be logged or used to train public language models.
			</p>
			<div class="grid grid-cols-1 gap-3 pt-2 text-center sm:grid-cols-3">
				<div class="rounded-2xl border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔒</div>
					<div class="mt-1 text-xs font-black">Local Storage Vault</div>
					<div class="text-[10px] text-gray-600">Encrypted in browser</div>
				</div>
				<div class="rounded-2xl border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🚫</div>
					<div class="mt-1 text-xs font-black">Zero Tracking</div>
					<div class="text-[10px] text-gray-600">No telemetry or cookies</div>
				</div>
				<div class="rounded-2xl border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔑</div>
					<div class="mt-1 text-xs font-black">BYOK Native</div>
					<div class="text-[10px] text-gray-600">Your keys in your keychain</div>
				</div>
			</div>
		</section>

		<!-- BOTTOM CTA -->
		<section
			class="space-y-4 rounded-3xl border-4 border-black bg-[#FFE5EC] p-8 text-center shadow-[8px_8px_0_#000]"
		>
			<div class="flex justify-center">
				<DisplayGhost interactive={true} />
			</div>
			<h3 class="text-2xl font-black text-black sm:text-3xl">Talk It Out. Free Your Brain.</h3>
			<p class="mx-auto max-w-lg text-sm text-gray-800 sm:text-base">
				No subscriptions. No logins. No blank-page terror. Just tap the ghost and talk.
			</p>
			<div class="pt-2">
				<a
					href="/"
					class="inline-block rounded-2xl border-2 border-black bg-black px-8 py-3.5 text-base font-black text-white shadow-[4px_4px_0_#FFE5E5] transition-all hover:-translate-y-0.5 hover:bg-gray-800"
				>
					Start Dictating Free →
				</a>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="mt-16 border-t-4 border-black bg-white py-8">
		<div class="mx-auto max-w-3xl space-y-4 px-4 text-center">
			<div class="flex flex-wrap items-center justify-center gap-4 text-sm font-bold">
				<a href="/" class="hover:underline">Dictation 🎙️</a>
				<span>•</span>
				<a href="/for/adhd" class="hover:underline">ADHD Studio 🧠</a>
				<span>•</span>
				<a href="/why" class="font-black text-indigo-700 hover:underline">Manifesto ⚡</a>
				<span>•</span>
				<a
					href="https://madebypablo.app"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:underline">Made by Pablo</a
				>
			</div>
			<p class="text-xs text-gray-500 opacity-70">
				© 2026 TalkType • Crafted with personality, utility, and soul in Melbourne.
			</p>
		</div>
	</footer>
</div>
