<script>
	import { MainContainer } from '$lib/components/page';
	import { absoluteUrl } from '$lib/config/seo.js';

	const canonicalUrl = 'https://talktype.app/for/adhd';
	const title = 'ADHD Dictation & Voice-to-Text App — Zero Blank Page Paralysis | TalkType';
	const description =
		'Dictation designed for ADHD brains and fast thinkers. Tap the friendly ghost, speak your stream-of-consciousness at 200 wpm, and get clean, structured notes with zero guilt.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="en" href={canonicalUrl} />
	<link rel="alternate" hreflang="es" href="https://talktype.app/es/tdah" />

	<!-- OpenGraph -->
	<meta property="og:type" content="website" />
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
				'@type': 'WebApplication',
				name: 'TalkType for ADHD & Fast Thinkers',
				url: canonicalUrl,
				image: absoluteUrl('/og-card.jpg'),
				description: description,
				applicationCategory: 'HealthApplication',
				operatingSystem: 'Web',
				inLanguage: 'en',
				offers: {
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'USD',
					description: 'Free voice-to-text dictation with offline privacy'
				}
			},
			{
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'Why is TalkType helpful for ADHD brains?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Traditional text editors have a blinking cursor that triggers blank-page paralysis. TalkType replaces the empty page with a friendly bouncing ghost—you just tap, speak your messy brain dump, and it automatically formats it into clean, readable text.'
						}
					},
					{
						'@type': 'Question',
						name: 'Does TalkType work offline?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes! TalkType includes a local Whisper WebAssembly model that runs 100% in your browser. Your private thoughts never leave your device.'
						}
					},
					{
						'@type': 'Question',
						name: 'Is there a time limit on free recordings?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'You can dictate unlimited times every day for free. Supporter Passes are available for multi-device vault sync and custom AI styling.'
						}
					}
				]
			}
		]
	})}
	</script>`}
</svelte:head>

<MainContainer />
