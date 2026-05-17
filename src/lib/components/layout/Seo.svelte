<script>
	import {
		DEFAULT_SEO,
		SITE_NAME,
		absoluteUrl,
		createWebApplicationSchema
	} from '$lib/config/seo.js';

	export let title = DEFAULT_SEO.title;
	export let description = DEFAULT_SEO.description;
	export let path = '/';
	export let image = DEFAULT_SEO.image;
	export let imageAlt = DEFAULT_SEO.imageAlt;
	export let type = DEFAULT_SEO.type;
	export let locale = DEFAULT_SEO.locale;
	export let noindex = false;
	export let includeStructuredData = true;
	export let structuredData = null;

	$: canonicalUrl = absoluteUrl(path);
	$: imageUrl = absoluteUrl(image);
	$: robots = noindex
		? 'noindex, nofollow'
		: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
	$: schema = includeStructuredData
		? structuredData ||
			createWebApplicationSchema({
				url: canonicalUrl,
				description,
				image: imageUrl
			})
		: null;
	$: schemaJson = schema ? JSON.stringify(schema).replace(/</g, '\\u003c') : '';
	$: schemaMarkup = schemaJson
		? `<script type="application/ld+json">${schemaJson}<` + '/script>'
		: '';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={robots} />
	<link rel="canonical" href={canonicalUrl} />

	<meta property="og:type" content={type} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content={locale} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:url" content={imageUrl} />
	<meta property="og:image:secure_url" content={imageUrl} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={imageAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:domain" content="talktype.app" />
	<meta name="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
	<meta name="twitter:image:alt" content={imageAlt} />

	{#if schema}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- safe constant JSON-LD with escaped '<' -->
		{@html schemaMarkup}
	{/if}
</svelte:head>
