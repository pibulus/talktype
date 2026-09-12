<script>
	import { MainContainer } from '$lib/components/page';
	import { absoluteUrl } from '$lib/config/seo.js';

	const canonicalUrl = 'https://talktype.app/es';
	const title = 'TalkType en Español | El Fantasmita de Voz — Habla en bola, sale limpio';
	const description =
		'Transcribe notas de voz y audios de WhatsApp al instante. Dictado rápido de voz a texto, modo sin conexión privado y reescritura inteligente. Toca al fantasma y habla.';

	// Assembled here, not inline in the head: eslint's Svelte parser cannot read
	// a <script> tag inside a template literal in markup, and the split closing tag
	// stops the real parser ending the block early. Same shape as Seo.svelte.
	const schemaMarkup =
		'<script type="application/ld+json">' +
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'TalkType en Español',
			alternateName: 'TalkType.app/es',
			url: canonicalUrl,
			image: absoluteUrl('/og-card.jpg'),
			description: description,
			applicationCategory: 'UtilitiesApplication',
			applicationSubCategory: 'Transcripción de voz a texto',
			operatingSystem: 'Web',
			inLanguage: 'es',
			isAccessibleForFree: true,
			offers: [
				{
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'USD',
					description: 'Transcripción gratuita de voz a texto'
				},
				{
					'@type': 'Offer',
					price: '39',
					priceCurrency: 'USD',
					description: 'Pase Anual de Soporte para historial ilimitado y exportación'
				}
			],
			browserRequirements:
				'Requiere un navegador moderno con acceso al micrófono. El modo sin conexión usa modelos locales de reconocimiento de voz.',
			keywords:
				'voz a texto, transcribir audios whatsapp, dictado por voz, transcripcion en vivo, notas de voz, offline speech to text'
		}).replace(/</g, '\\u003c') +
		'<' +
		'/script>';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="es" href={canonicalUrl} />
	<link rel="alternate" hreflang="en" href="https://talktype.app" />

	<!-- OpenGraph -->
	<meta property="og:type" content="website" />
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

<MainContainer />
