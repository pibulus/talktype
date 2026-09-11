<script>
	import { absoluteUrl } from '$lib/config/seo.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';

	const canonicalUrl = 'https://talktype.app/why';
	const title = 'Why We Don\'t Charge $144/year — The Sovereign Voice Manifesto | TalkType';
	const description =
		'Why pay $144/year to rent a speech-to-text API? TalkType is built on sovereign software principles: free forever with local browser AI, BYOK option, zero tracking, and designed for ADHD executive function.';
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
	{@html `<script type="application/ld+json">
	${JSON.stringify({
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
	})}
	</script>`}
</svelte:head>

<div class="min-h-screen bg-[#FAF8F5] font-sans text-[#1e1714] selection:bg-[#FFE5E5] flex flex-col justify-between">
	<!-- Top Navigation -->
	<nav class="w-full border-b-4 border-black bg-[#FFE5EC] px-4 py-3 sticky top-0 z-30 shadow-[0_4px_0_#000]">
		<div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
			<a href="/" class="font-black text-lg sm:text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
				<span class="text-2xl">👻</span>
				<span>TalkType</span>
				<span class="text-xs bg-black text-[#FFE5EC] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
					Manifesto & Guide
				</span>
			</a>

			<div class="flex items-center gap-3">
				<a
					href="/es/por-que"
					class="text-xs font-bold bg-white border-2 border-black px-2.5 py-1 rounded-lg shadow-[2px_2px_0_#000] hover:bg-yellow-100 transition-colors"
				>
					🇲🇽 Español
				</a>
				<a
					href="/"
					class="text-xs font-black bg-black text-white px-3 py-1.5 rounded-lg shadow-[2px_2px_0_#000] hover:bg-gray-800 transition-colors"
				>
					Open Dictation 🎙️
				</a>
			</div>
		</div>
	</nav>

	<!-- Main Content Shell -->
	<main class="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-12">
		<!-- Hero Header -->
		<header class="text-center space-y-4">
			<div class="inline-block bg-[#E5F9FF] border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
				⚡ Sovereign Software Manifesto 2026
			</div>
			<h1 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
				Why We Don’t Charge $144/year to Rent Your Own Voice
			</h1>
			<p class="text-base sm:text-lg text-gray-700 max-w-xl mx-auto leading-relaxed">
				The economics of speech-to-text, the death of subscription extortion, and the 3-step dictation protocol for ADHD and fast thinkers.
			</p>
		</header>

		<!-- SECTION 1: THE ECONOMICS EXPOSÉ -->
		<section class="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-6">
			<div class="space-y-1">
				<div class="inline-block bg-yellow-100 text-yellow-900 border-2 border-black px-3 py-0.5 rounded-full text-xs font-black uppercase">
					💰 The Racket Exposed
				</div>
				<h2 class="text-2xl sm:text-3xl font-black tracking-tight">
					Speech APIs Cost Fractions of a Cent
				</h2>
			</div>

			<div class="text-sm sm:text-base text-gray-800 leading-relaxed space-y-4">
				<p>
					Venture-backed transcription apps charge <strong>$12 to $15 every month</strong> ($144 to $180/year) for something that costs them approximately <strong>$0.004 per minute</strong> via models like Deepgram or local Whisper.
				</p>
				<p>
					If you speak for 10 minutes a day, the actual raw compute cost is about <strong>$1.20 per year</strong>. Charging $144 is a 12,000% markup designed to fund sales teams, venture dividends, and lock your cognitive output behind recurring tollgates.
				</p>
			</div>

			<!-- Comparison Table -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
				<div class="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-2">
					<div class="font-black text-red-900 text-sm flex items-center gap-1.5">
						<span>❌</span>
						<span>Venture Dictation Apps</span>
					</div>
					<ul class="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
						<li>$144 – $180/year forever</li>
						<li>Cancelling locks you out of your historical transcripts</li>
						<li>Audio and text fed into training datasets</li>
						<li>Corporate, sterile interfaces with blank-page pressure</li>
					</ul>
				</div>

				<div class="bg-green-50 border-2 border-green-400 rounded-2xl p-4 space-y-2">
					<div class="font-black text-green-900 text-sm flex items-center gap-1.5">
						<span>✅</span>
						<span>TalkType Sovereign Standard</span>
					</div>
					<ul class="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
						<li>Free unlimited daily web dictation</li>
						<li>Option to Bring Your Own API Key (zero markup)</li>
						<li>$49 Supporter Pass or $39 one-time Mac app (own it, don't rent it)</li>
						<li>Transcripts stored locally on your device with zero tracking</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- SECTION 2: THE FAST-BRAIN DICTATION PROTOCOL -->
		<section class="bg-[#FFF4E8] border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-6">
			<div class="space-y-1">
				<div class="inline-block bg-purple-100 text-purple-900 border-2 border-black px-3 py-0.5 rounded-full text-xs font-black uppercase">
					🧠 Cognitive Ergonomics
				</div>
				<h2 class="text-2xl sm:text-3xl font-black tracking-tight">
					The 3-Step ADHD & Fast-Brain Protocol
				</h2>
			</div>

			<p class="text-sm sm:text-base text-gray-800 leading-relaxed">
				When you have a fast, non-linear brain, typing with your fingers is too slow. The gap between thought speed (250+ wpm) and typing speed (60 wpm) creates working memory bottlenecks and executive dysfunction paralysis.
			</p>

			<div class="space-y-4">
				<div class="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_#000] space-y-1">
					<div class="font-black text-sm text-black flex items-center gap-2">
						<span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
						<span>The Raw Stream-of-Consciousness Dump</span>
					</div>
					<p class="text-xs text-gray-700 leading-relaxed">
						Tap the bouncing ghost and speak whatever is in your head. Do NOT worry about grammar, full sentences, "ums", or chronological order. Speak at full conversational velocity.
					</p>
				</div>

				<div class="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_#000] space-y-1">
					<div class="font-black text-sm text-black flex items-center gap-2">
						<span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
						<span>Automated Semantic Compression</span>
					</div>
					<p class="text-xs text-gray-700 leading-relaxed">
						TalkType’s AI structuring cleans filler words, identifies key action items, and generates neat markdown bullet lists or polished prose depending on your style.
					</p>
				</div>

				<div class="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_#000] space-y-1">
					<div class="font-black text-sm text-black flex items-center gap-2">
						<span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
						<span>1-Tap Dispersion (Zero Filing Anxiety)</span>
					</div>
					<p class="text-xs text-gray-700 leading-relaxed">
						Don’t organize notes in complex nested folders you’ll never open again. Tap "Copy" and send it straight to Slack, an email draft, Obsidian, or your project tracker.
					</p>
				</div>
			</div>
		</section>

		<!-- SECTION 3: PRIVACY & DATA SOVEREIGNTY -->
		<section class="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-4">
			<h2 class="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
				<span>🛡️</span>
				<span>Your Thoughts Are Not Training Data</span>
			</h2>
			<p class="text-sm sm:text-base text-gray-800 leading-relaxed">
				When you dictate personal journals, therapy notes, or sensitive business strategy, your audio should never be logged or used to train public language models.
			</p>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center">
				<div class="border-2 border-black rounded-2xl p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔒</div>
					<div class="font-black text-xs mt-1">Local Storage Vault</div>
					<div class="text-[10px] text-gray-600">Encrypted in browser</div>
				</div>
				<div class="border-2 border-black rounded-2xl p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🚫</div>
					<div class="font-black text-xs mt-1">Zero Tracking</div>
					<div class="text-[10px] text-gray-600">No telemetry or cookies</div>
				</div>
				<div class="border-2 border-black rounded-2xl p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔑</div>
					<div class="font-black text-xs mt-1">BYOK Native</div>
					<div class="text-[10px] text-gray-600">Your keys in your keychain</div>
				</div>
			</div>
		</section>

		<!-- BOTTOM CTA -->
		<section class="bg-[#FFE5EC] border-4 border-black rounded-3xl p-8 shadow-[8px_8px_0_#000] text-center space-y-4">
			<div class="flex justify-center">
				<DisplayGhost interactive={true} />
			</div>
			<h3 class="text-2xl sm:text-3xl font-black text-black">
				Talk It Out. Free Your Brain.
			</h3>
			<p class="text-sm sm:text-base text-gray-800 max-w-lg mx-auto">
				No subscriptions. No logins. No blank-page terror. Just tap the ghost and talk.
			</p>
			<div class="pt-2">
				<a
					href="/"
					class="inline-block bg-black text-white font-black text-base px-8 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_#FFE5E5] hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
				>
					Start Dictating Free →
				</a>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="mt-16 py-8 border-t-4 border-black bg-white">
		<div class="max-w-3xl mx-auto px-4 text-center space-y-4">
			<div class="flex items-center justify-center gap-4 flex-wrap text-sm font-bold">
				<a href="/" class="hover:underline">Dictation 🎙️</a>
				<span>•</span>
				<a href="/for/adhd" class="hover:underline">ADHD Studio 🧠</a>
				<span>•</span>
				<a href="/why" class="hover:underline text-indigo-700 font-black">Manifesto ⚡</a>
				<span>•</span>
				<a href="https://madebypablo.app" target="_blank" rel="noopener noreferrer" class="hover:underline">Made by Pablo</a>
			</div>
			<p class="text-xs text-gray-500 opacity-70">
				© 2026 TalkType • Crafted with personality, utility, and soul in Melbourne.
			</p>
		</div>
	</footer>
</div>
