<script>
	import { page } from '$app/stores';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { Seo } from '$lib/components/layout';

	$: isDetour = $page.status === 404;
	$: title = isDetour ? 'A Tiny Detour | TalkType' : 'A Quick Breather | TalkType';
	$: heading = isDetour ? 'This page took the scenic route' : 'The ghost needs a tiny breather';
	$: description = isDetour
		? 'Head back to TalkType and keep talking.'
		: 'Give it a moment, then hop back in.';
</script>

<Seo
	{title}
	description="Head back to TalkType and keep talking."
	path="/"
	noindex={true}
	includeStructuredData={false}
/>

<main class="flex min-h-screen items-center justify-center bg-[#fffaef] px-5 py-10 text-gray-800">
	<section class="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
		<div class="h-28 w-28">
			<DisplayGhost theme="peach" size="100%" />
		</div>

		<div class="space-y-2">
			<p class="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">TalkType</p>
			<h1 class="text-3xl font-black tracking-tight">{heading}</h1>
			<p class="text-sm leading-6 text-gray-600">{description}</p>
		</div>

		<a
			href="/"
			class="btn min-h-12 w-full rounded-full border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600 sm:w-auto sm:px-8"
		>
			Back to TalkType
		</a>
	</section>
</main>
