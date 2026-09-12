<script>
	import { absoluteUrl } from '$lib/config/seo.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';

	const canonicalUrl = 'https://talktype.app/es/por-que';
	const title = 'Por Qué No Cobramos $144/año — El Manifiesto de Voz Soberana | TalkType';
	const description =
		'¿Por qué pagar $144/año por rentar una API de dictado? TalkType se rige por principios de software soberano: gratis para siempre, IA local en navegador, opción BYOK y diseñado para cerebros rápidos.';

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
					headline: 'Por Qué No Cobramos $144/año — El Manifiesto de Voz Soberana',
					url: canonicalUrl,
					image: absoluteUrl('/og-card.jpg'),
					description: description,
					inLanguage: 'es',
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
							name: '¿Por qué las apps de voz de Silicon Valley cobran $12 a $15 dólares al mes?',
							acceptedAnswer: {
								'@type': 'Answer',
								text: 'Empaquetan APIs de transcripción que cuestan $0.004 dólares por minuto, le agregan una barrera de suscripción mensual y te cobran de $144 a $180 USD al año por rentar tu propia voz.'
							}
						},
						{
							'@type': 'Question',
							name: '¿Cómo protege TalkType la privacidad de mis notas de voz?',
							acceptedAnswer: {
								'@type': 'Answer',
								text: 'TalkType guarda tus notas estrictamente en el almacenamiento local de tu navegador o en el llavero de tu Mac. Jamás vende tus audios ni entrena modelos comerciales de IA con tus pensamientos.'
							}
						},
						{
							'@type': 'Question',
							name: '¿Cómo ayuda el protocolo de dictado para mentes rápidas y TDAH?',
							acceptedAnswer: {
								'@type': 'Answer',
								text: 'Separa la creación del pensamiento de la estructura del texto. Hablas a 200 palabras por minuto sin preocuparte por la puntuación, y la IA organiza tus ideas en notas limpias en formato markdown.'
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
	<link rel="alternate" hreflang="es" href={canonicalUrl} />
	<link rel="alternate" hreflang="en" href="https://talktype.app/why" />

	<!-- OpenGraph -->
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="TalkType" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={absoluteUrl('/og-card.jpg')} />
	<meta property="og:locale" content="es_LA" />

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
				href="/es"
				class="flex items-center gap-2 text-lg font-black tracking-tight transition-opacity hover:opacity-80 sm:text-xl"
			>
				<span class="text-2xl">👻</span>
				<span>TalkType</span>
				<span
					class="rounded-full bg-black px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[#FFE5EC]"
				>
					Manifiesto & Guía
				</span>
			</a>

			<div class="flex items-center gap-3">
				<a
					href="/why"
					class="rounded-lg border-2 border-black bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_#000] transition-colors hover:bg-yellow-100"
				>
					🇦🇺 English
				</a>
				<a
					href="/es"
					class="rounded-lg bg-black px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0_#000] transition-colors hover:bg-gray-800"
				>
					Dictado en Vivo 🎙️
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
				⚡ Manifiesto de Software Soberano 2026
			</div>
			<h1 class="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
				Por Qué No Cobramos $144/año por Rentar Tu Propia Voz
			</h1>
			<p class="mx-auto max-w-xl text-base leading-relaxed text-gray-700 sm:text-lg">
				La verdad sobre el costo real de las APIs de transcripción, el fin de la extorsión de
				suscripciones y el protocolo de dictado en 3 pasos para cerebros rápidos y TDAH.
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
					💰 El Negocio al Descubierto
				</div>
				<h2 class="text-2xl font-black tracking-tight sm:text-3xl">
					Las APIs de Voz Cuestan Fracciones de Centavo
				</h2>
			</div>

			<div class="space-y-4 text-sm leading-relaxed text-gray-800 sm:text-base">
				<p>
					Las aplicaciones de fondos de inversión cobran <strong>$12 a $15 USD al mes</strong> ($144
					a $180/año) por un servicio cuyo costo real de cómputo es de aproximadamente
					<strong>$0.004 dólares por minuto</strong> usando modelos como Deepgram o Whisper.
				</p>
				<p>
					Si dictas 10 minutos al día, el costo real en servidores es de unos <strong
						>$1.20 dólares al año</strong
					>. Cobrarte $144 es un sobreprecio del 12,000% diseñado para inflar rondas de inversión y
					mantener tus notas secuestradas.
				</p>
			</div>

			<!-- Comparison Table -->
			<div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
				<div class="space-y-2 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
					<div class="flex items-center gap-1.5 text-sm font-black text-red-900">
						<span>❌</span>
						<span>Apps Corporativas Tradicionales</span>
					</div>
					<ul class="list-inside list-disc space-y-1.5 text-xs text-gray-700">
						<li>$144 – $180 USD al año para siempre</li>
						<li>Si cancelas, pierdes acceso a tus transcripciones históricas</li>
						<li>Tus audios y textos alimentan bases de entrenamiento</li>
						<li>Interfaces corporativas frías con la presión de la hoja en blanco</li>
					</ul>
				</div>

				<div class="space-y-2 rounded-2xl border-2 border-green-400 bg-green-50 p-4">
					<div class="flex items-center gap-1.5 text-sm font-black text-green-900">
						<span>✅</span>
						<span>El Estándar Soberano TalkType</span>
					</div>
					<ul class="list-inside list-disc space-y-1.5 text-xs text-gray-700">
						<li>Dictado web ilimitado gratis todos los días</li>
						<li>Opción de conectar tu propia clave API (BYOK sin sobreprecio)</li>
						<li>Pase de Contribuidor de $49 o app para Mac de $39 en un solo pago</li>
						<li>Notas guardadas localmente en tu dispositivo con cero rastreo</li>
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
					🧠 Ergonomía Cognitiva
				</div>
				<h2 class="text-2xl font-black tracking-tight sm:text-3xl">
					El Protocolo de Dictado para Mentes Rápidas y TDAH
				</h2>
			</div>

			<p class="text-sm leading-relaxed text-gray-800 sm:text-base">
				Cuando tienes un cerebro rápido y no lineal, escribir con los dedos es demasiado lento. La
				brecha entre la velocidad del pensamiento (más de 250 palabras por minuto) y el teclado (60
				ppm) genera fricción de memoria de trabajo y parálisis de función ejecutiva.
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
						<span>Vaciado en Crudo (Cero Filtro)</span>
					</div>
					<p class="text-xs leading-relaxed text-gray-700">
						Toca al fantasmita y di lo que tengas en la cabeza. NO te preocupes por la gramática,
						muletillas o el orden cronológico. Habla a velocidad natural de conversación.
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
						<span>Compresión Semántica Automática</span>
					</div>
					<p class="text-xs leading-relaxed text-gray-700">
						La IA de TalkType limpia pausas, extrae puntos de acción clave y genera listas en
						markdown o prosa impecable según el estilo que elijas.
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
						<span>Dispersión en 1 Toque (Cero Ansiedad de Carpetas)</span>
					</div>
					<p class="text-xs leading-relaxed text-gray-700">
						No pierdas tiempo archivando en carpetas anidadas que nunca abrirás. Toca "Copiar" y
						pégalo directo en Slack, un correo, Obsidian o tu gestor de proyectos.
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
				<span>Tus Pensamientos No Son Datos de Entrenamiento</span>
			</h2>
			<p class="text-sm leading-relaxed text-gray-800 sm:text-base">
				Cuando dictas diarios personales, notas de terapia o estrategias de trabajo confidenciales,
				tu audio jamás debe quedar registrado en servidores de terceros.
			</p>
			<div class="grid grid-cols-1 gap-3 pt-2 text-center sm:grid-cols-3">
				<div class="rounded-2xl border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔒</div>
					<div class="mt-1 text-xs font-black">Bóveda Local</div>
					<div class="text-[10px] text-gray-600">Cifrado en navegador</div>
				</div>
				<div class="rounded-2xl border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🚫</div>
					<div class="mt-1 text-xs font-black">Cero Rastreo</div>
					<div class="text-[10px] text-gray-600">Sin cookies ni telemetría</div>
				</div>
				<div class="rounded-2xl border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔑</div>
					<div class="mt-1 text-xs font-black">Nativo BYOK</div>
					<div class="text-[10px] text-gray-600">Tus llaves en tu llavero</div>
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
			<h3 class="text-2xl font-black text-black sm:text-3xl">Dilo en Voz Alta. Libera Tu Mente.</h3>
			<p class="mx-auto max-w-lg text-sm text-gray-800 sm:text-base">
				Sin suscripciones. Sin inicios de sesión obligatorios. Sin el pánico de la hoja en blanco.
				Solo toca al fantasmita y habla.
			</p>
			<div class="pt-2">
				<a
					href="/es"
					class="inline-block rounded-2xl border-2 border-black bg-black px-8 py-3.5 text-base font-black text-white shadow-[4px_4px_0_#FFE5E5] transition-all hover:-translate-y-0.5 hover:bg-gray-800"
				>
					Comenzar a Dictar Gratis →
				</a>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="mt-16 border-t-4 border-black bg-white py-8">
		<div class="mx-auto max-w-3xl space-y-4 px-4 text-center">
			<div class="flex flex-wrap items-center justify-center gap-4 text-sm font-bold">
				<a href="/es" class="hover:underline">Dictado 🎙️</a>
				<span>•</span>
				<a href="/es/tdah" class="hover:underline">Estudio TDAH 🧠</a>
				<span>•</span>
				<a href="/es/por-que" class="font-black text-indigo-700 hover:underline">Manifiesto ⚡</a>
				<span>•</span>
				<a
					href="https://madebypablo.app"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:underline">Hecho por Pablo</a
				>
			</div>
			<p class="text-xs text-gray-500 opacity-70">
				© 2026 TalkType • Diseñado con personalidad, utilidad y alma por un mexicano-australiano en
				Melbourne.
			</p>
		</div>
	</footer>
</div>
