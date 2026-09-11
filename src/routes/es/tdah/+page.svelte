<script>
	import { MainContainer } from '$lib/components/page';
	import { absoluteUrl } from '$lib/config/seo.js';

	const canonicalUrl = 'https://talktype.app/es/tdah';
	const title = 'Dictado por Voz para TDAH y Mentes Rápidas — Cero Parálisis | TalkType';
	const description =
		'Dictado por voz diseñado para personas con TDAH y pensamientos rápidos. Toca al fantasmita amigable, habla en bola sin filtro y obtén notas estructuradas y limpias sin culpa.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="es" href={canonicalUrl} />
	<link rel="alternate" hreflang="en" href="https://talktype.app/for/adhd" />

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
	{@html `<script type="application/ld+json">
	${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebApplication',
				name: 'TalkType para TDAH y Mentes Rápidas',
				url: canonicalUrl,
				image: absoluteUrl('/og-card.jpg'),
				description: description,
				applicationCategory: 'HealthApplication',
				operatingSystem: 'Web',
				inLanguage: 'es',
				offers: {
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'USD',
					description: 'Dictado de voz a texto gratuito con privacidad sin conexión'
				}
			},
			{
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: '¿Por qué TalkType ayuda a personas con TDAH?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Los editores de texto tradicionales muestran un cursor parpadeante que provoca bloqueo y parálisis ante la página en blanco. TalkType lo reemplaza con un fantasmita amigable: solo tocas, hablas todo tu desahogo mental sin filtro y la app lo limpia y organiza en puntos clave.'
						}
					},
					{
						'@type': 'Question',
						name: '¿Funciona sin conexión a internet?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: '¡Sí! TalkType incluye un modelo Whisper WebAssembly local que corre 100% en tu navegador. Tus pensamientos privados nunca salen de tu dispositivo.'
						}
					},
					{
						'@type': 'Question',
						name: '¿Hay límite de grabaciones gratuitas?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Puedes dictar de forma ilimitada todos los días gratis. El Pase de Soporte está disponible para sincronización cifrada entre dispositivos y estilos personalizados con IA.'
						}
					}
				]
			}
		]
	})}
	</script>`}
</svelte:head>

<MainContainer />
