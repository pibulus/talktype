<script>
	import { absoluteUrl } from '$lib/config/seo.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';

	const canonicalUrl = 'https://talktype.app/es/por-que';
	const title = 'Por Qué No Cobramos $144/año — El Manifiesto de Voz Soberana | TalkType';
	const description =
		'¿Por qué pagar $144/año por rentar una API de dictado? TalkType se rige por principios de software soberano: gratis para siempre, IA local en navegador, opción BYOK y diseñado para cerebros rápidos.';
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
	{@html `<script type="application/ld+json">
	${JSON.stringify({
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
	})}
	</script>`}
</svelte:head>

<div class="min-h-screen bg-[#FAF8F5] font-sans text-[#1e1714] selection:bg-[#FFE5E5] flex flex-col justify-between">
	<!-- Top Navigation -->
	<nav class="w-full border-b-4 border-black bg-[#FFE5EC] px-4 py-3 sticky top-0 z-30 shadow-[0_4px_0_#000]">
		<div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
			<a href="/es" class="font-black text-lg sm:text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
				<span class="text-2xl">👻</span>
				<span>TalkType</span>
				<span class="text-xs bg-black text-[#FFE5EC] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
					Manifiesto & Guía
				</span>
			</a>

			<div class="flex items-center gap-3">
				<a
					href="/why"
					class="text-xs font-bold bg-white border-2 border-black px-2.5 py-1 rounded-lg shadow-[2px_2px_0_#000] hover:bg-yellow-100 transition-colors"
				>
					🇦🇺 English
				</a>
				<a
					href="/es"
					class="text-xs font-black bg-black text-white px-3 py-1.5 rounded-lg shadow-[2px_2px_0_#000] hover:bg-gray-800 transition-colors"
				>
					Dictado en Vivo 🎙️
				</a>
			</div>
		</div>
	</nav>

	<!-- Main Content Shell -->
	<main class="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-12">
		<!-- Hero Header -->
		<header class="text-center space-y-4">
			<div class="inline-block bg-[#E5F9FF] border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
				⚡ Manifiesto de Software Soberano 2026
			</div>
			<h1 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
				Por Qué No Cobramos $144/año por Rentar Tu Propia Voz
			</h1>
			<p class="text-base sm:text-lg text-gray-700 max-w-xl mx-auto leading-relaxed">
				La verdad sobre el costo real de las APIs de transcripción, el fin de la extorsión de suscripciones y el protocolo de dictado en 3 pasos para cerebros rápidos y TDAH.
			</p>
		</header>

		<!-- SECTION 1: THE ECONOMICS EXPOSÉ -->
		<section class="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-6">
			<div class="space-y-1">
				<div class="inline-block bg-yellow-100 text-yellow-900 border-2 border-black px-3 py-0.5 rounded-full text-xs font-black uppercase">
					💰 El Negocio al Descubierto
				</div>
				<h2 class="text-2xl sm:text-3xl font-black tracking-tight">
					Las APIs de Voz Cuestan Fracciones de Centavo
				</h2>
			</div>

			<div class="text-sm sm:text-base text-gray-800 leading-relaxed space-y-4">
				<p>
					Las aplicaciones de fondos de inversión cobran <strong>$12 a $15 USD al mes</strong> ($144 a $180/año) por un servicio cuyo costo real de cómputo es de aproximadamente <strong>$0.004 dólares por minuto</strong> usando modelos como Deepgram o Whisper.
				</p>
				<p>
					Si dictas 10 minutos al día, el costo real en servidores es de unos <strong>$1.20 dólares al año</strong>. Cobrarte $144 es un sobreprecio del 12,000% diseñado para inflar rondas de inversión y mantener tus notas secuestradas.
				</p>
			</div>

			<!-- Comparison Table -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
				<div class="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-2">
					<div class="font-black text-red-900 text-sm flex items-center gap-1.5">
						<span>❌</span>
						<span>Apps Corporativas Tradicionales</span>
					</div>
					<ul class="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
						<li>$144 – $180 USD al año para siempre</li>
						<li>Si cancelas, pierdes acceso a tus transcripciones históricas</li>
						<li>Tus audios y textos alimentan bases de entrenamiento</li>
						<li>Interfaces corporativas frías con la presión de la hoja en blanco</li>
					</ul>
				</div>

				<div class="bg-green-50 border-2 border-green-400 rounded-2xl p-4 space-y-2">
					<div class="font-black text-green-900 text-sm flex items-center gap-1.5">
						<span>✅</span>
						<span>El Estándar Soberano TalkType</span>
					</div>
					<ul class="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
						<li>Dictado web ilimitado gratis todos los días</li>
						<li>Opción de conectar tu propia clave API (BYOK sin sobreprecio)</li>
						<li>Pase de Contribuidor de $49 o app para Mac de $39 en un solo pago</li>
						<li>Notas guardadas localmente en tu dispositivo con cero rastreo</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- SECTION 2: THE FAST-BRAIN DICTATION PROTOCOL -->
		<section class="bg-[#FFF4E8] border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-6">
			<div class="space-y-1">
				<div class="inline-block bg-purple-100 text-purple-900 border-2 border-black px-3 py-0.5 rounded-full text-xs font-black uppercase">
					🧠 Ergonomía Cognitiva
				</div>
				<h2 class="text-2xl sm:text-3xl font-black tracking-tight">
					El Protocolo de Dictado para Mentes Rápidas y TDAH
				</h2>
			</div>

			<p class="text-sm sm:text-base text-gray-800 leading-relaxed">
				Cuando tienes un cerebro rápido y no lineal, escribir con los dedos es demasiado lento. La brecha entre la velocidad del pensamiento (más de 250 palabras por minuto) y el teclado (60 ppm) genera fricción de memoria de trabajo y parálisis de función ejecutiva.
			</p>

			<div class="space-y-4">
				<div class="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_#000] space-y-1">
					<div class="font-black text-sm text-black flex items-center gap-2">
						<span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
						<span>Vaciado en Crudo (Cero Filtro)</span>
					</div>
					<p class="text-xs text-gray-700 leading-relaxed">
						Toca al fantasmita y di lo que tengas en la cabeza. NO te preocupes por la gramática, muletillas o el orden cronológico. Habla a velocidad natural de conversación.
					</p>
				</div>

				<div class="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_#000] space-y-1">
					<div class="font-black text-sm text-black flex items-center gap-2">
						<span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
						<span>Compresión Semántica Automática</span>
					</div>
					<p class="text-xs text-gray-700 leading-relaxed">
						La IA de TalkType limpia pausas, extrae puntos de acción clave y genera listas en markdown o prosa impecable según el estilo que elijas.
					</p>
				</div>

				<div class="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_#000] space-y-1">
					<div class="font-black text-sm text-black flex items-center gap-2">
						<span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
						<span>Dispersión en 1 Toque (Cero Ansiedad de Carpetas)</span>
					</div>
					<p class="text-xs text-gray-700 leading-relaxed">
						No pierdas tiempo archivando en carpetas anidadas que nunca abrirás. Toca "Copiar" y pégalo directo en Slack, un correo, Obsidian o tu gestor de proyectos.
					</p>
				</div>
			</div>
		</section>

		<!-- SECTION 3: PRIVACY & DATA SOVEREIGNTY -->
		<section class="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-4">
			<h2 class="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
				<span>🛡️</span>
				<span>Tus Pensamientos No Son Datos de Entrenamiento</span>
			</h2>
			<p class="text-sm sm:text-base text-gray-800 leading-relaxed">
				Cuando dictas diarios personales, notas de terapia o estrategias de trabajo confidenciales, tu audio jamás debe quedar registrado en servidores de terceros.
			</p>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center">
				<div class="border-2 border-black rounded-2xl p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔒</div>
					<div class="font-black text-xs mt-1">Bóveda Local</div>
					<div class="text-[10px] text-gray-600">Cifrado en navegador</div>
				</div>
				<div class="border-2 border-black rounded-2xl p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🚫</div>
					<div class="font-black text-xs mt-1">Cero Rastreo</div>
					<div class="text-[10px] text-gray-600">Sin cookies ni telemetría</div>
				</div>
				<div class="border-2 border-black rounded-2xl p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
					<div class="text-xl">🔑</div>
					<div class="font-black text-xs mt-1">Nativo BYOK</div>
					<div class="text-[10px] text-gray-600">Tus llaves en tu llavero</div>
				</div>
			</div>
		</section>

		<!-- BOTTOM CTA -->
		<section class="bg-[#FFE5EC] border-4 border-black rounded-3xl p-8 shadow-[8px_8px_0_#000] text-center space-y-4">
			<div class="flex justify-center">
				<DisplayGhost interactive={true} />
			</div>
			<h3 class="text-2xl sm:text-3xl font-black text-black">
				Dilo en Voz Alta. Libera Tu Mente.
			</h3>
			<p class="text-sm sm:text-base text-gray-800 max-w-lg mx-auto">
				Sin suscripciones. Sin inicios de sesión obligatorios. Sin el pánico de la hoja en blanco. Solo toca al fantasmita y habla.
			</p>
			<div class="pt-2">
				<a
					href="/es"
					class="inline-block bg-black text-white font-black text-base px-8 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_#FFE5E5] hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
				>
					Comenzar a Dictar Gratis →
				</a>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="mt-16 py-8 border-t-4 border-black bg-white">
		<div class="max-w-3xl mx-auto px-4 text-center space-y-4">
			<div class="flex items-center justify-center gap-4 flex-wrap text-sm font-bold">
				<a href="/es" class="hover:underline">Dictado 🎙️</a>
				<span>•</span>
				<a href="/es/tdah" class="hover:underline">Estudio TDAH 🧠</a>
				<span>•</span>
				<a href="/es/por-que" class="hover:underline text-indigo-700 font-black">Manifiesto ⚡</a>
				<span>•</span>
				<a href="https://madebypablo.app" target="_blank" rel="noopener noreferrer" class="hover:underline">Hecho por Pablo</a>
			</div>
			<p class="text-xs text-gray-500 opacity-70">
				© 2026 TalkType • Diseñado con personalidad, utilidad y alma por un mexicano-australiano en Melbourne.
			</p>
		</div>
	</footer>
</div>
