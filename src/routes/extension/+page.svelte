<script>
	import { PageLayout } from '$lib/components/layout';

	const repoUrl = 'https://github.com/pibulus/talktype_extension';
	const aiStudioUrl = 'https://aistudio.google.com/app/apikey';
	const downloadUrl = '/downloads/talktype-extension.zip';
	const checksumUrl = '/downloads/talktype-extension.zip.sha256';
	const extensionVersion = '1.4';
</script>

<PageLayout
	title="TalkType Extension | Voice Typing For Any Text Box"
	description="Install the TalkType Chrome extension to use voice typing across Gmail, Notion, chat apps, forms, and docs."
	path="/extension"
>
	<div class="w-full max-w-3xl space-y-5 text-gray-800">
		<div class="space-y-3 text-center">
			<p class="text-xs font-black uppercase tracking-[0.2em] text-pink-500">TalkType Extension</p>
			<h1 class="text-4xl font-black tracking-tight sm:text-5xl">
				Voice typing for any text box on the web
			</h1>
			<p class="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
				Click the mic, speak naturally, and TalkType drops the words right where your cursor is.
				Gmail, Notion, docs, forms, chat apps, weird CMSes. Same ghost, different surface.
			</p>
			<div class="mx-auto flex max-w-xl flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
				<a
					href={downloadUrl}
					download
					class="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
				>
					Download extension zip
				</a>
				<a
					href={repoUrl}
					target="_blank"
					rel="noreferrer"
					class="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-pink-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-pink-300 hover:text-pink-600"
				>
					View source
				</a>
			</div>
			<p class="text-xs font-semibold text-gray-500">
				Desktop Chrome manual package v{extensionVersion}. Chrome Web Store listing is not live yet.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-3xl border border-pink-200 bg-white/90 p-5 shadow-sm">
				<h2 class="mb-2 text-lg font-black">What it does</h2>
				<p class="text-sm leading-relaxed text-gray-600">
					Adds a mic button near text fields and lets you dictate straight into the page instead of
					copy-pasting from a separate app.
				</p>
			</div>
			<div class="rounded-3xl border border-pink-200 bg-white/90 p-5 shadow-sm">
				<h2 class="mb-2 text-lg font-black">What you need</h2>
				<p class="text-sm leading-relaxed text-gray-600">
					Desktop Chrome, a Gemini API key, and microphone access. The extension uses your own key
					and sends audio directly to Google.
				</p>
			</div>
			<div class="rounded-3xl border border-pink-200 bg-white/90 p-5 shadow-sm">
				<h2 class="mb-2 text-lg font-black">Current install mode</h2>
				<p class="text-sm leading-relaxed text-gray-600">
					Manual zip install for now. The package is downloadable here; Chrome Web Store packaging
					is still the next trust step.
				</p>
			</div>
		</div>

		<div
			class="rounded-[2rem] border border-pink-200 bg-gradient-to-br from-white via-pink-50/80 to-amber-50/80 p-6 shadow-md"
		>
			<h2 class="mb-4 text-2xl font-black tracking-tight">Install it</h2>
			<ol class="space-y-3 pl-5 text-sm leading-relaxed text-gray-700 sm:text-base">
				<li>Download the TalkType extension zip from this page.</li>
				<li>Unzip it. You should see a folder named <strong>talktype-extension</strong>.</li>
				<li>
					In Chrome, go to <code class="rounded bg-pink-100 px-1.5 py-0.5 text-pink-700"
						>chrome://extensions</code
					>.
				</li>
				<li>Turn on <strong>Developer mode</strong>.</li>
				<li>Click <strong>Load unpacked</strong>.</li>
				<li>
					Select the unzipped <code class="rounded bg-pink-100 px-1.5 py-0.5 text-pink-700"
						>talktype-extension</code
					> folder.
				</li>
				<li>
					Open the extension, add your Gemini key, test the mic, then dictate into any text field.
				</li>
			</ol>

			<div class="mt-5 flex flex-col gap-3 sm:flex-row">
				<a
					href={downloadUrl}
					download
					class="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
				>
					Download extension zip
				</a>
				<a
					href={aiStudioUrl}
					target="_blank"
					rel="noreferrer"
					class="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-pink-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-pink-300 hover:text-pink-600"
				>
					Get Gemini API key
				</a>
			</div>
			<p class="mt-3 text-xs text-gray-500">
				Want to verify the package? Check the
				<a href={checksumUrl} class="font-semibold text-pink-600 hover:text-pink-700"
					>SHA-256 checksum</a
				>.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="rounded-3xl border border-pink-200 bg-white/90 p-5 shadow-sm">
				<h2 class="mb-2 text-lg font-black">Good fit</h2>
				<ul class="space-y-2 text-sm leading-relaxed text-gray-600">
					<li>Gmail and email replies</li>
					<li>Notion, docs, and notes</li>
					<li>Chat apps and social posts</li>
					<li>Any annoying form with too much typing</li>
				</ul>
			</div>
			<div class="rounded-3xl border border-pink-200 bg-white/90 p-5 shadow-sm">
				<h2 class="mb-2 text-lg font-black">Privacy</h2>
				<p class="text-sm leading-relaxed text-gray-600">
					The extension uses your own Gemini key and sends audio directly to Google for
					transcription. There is no TalkType transcription server in the middle.
				</p>
				<a
					href="/extension/privacy"
					class="mt-3 inline-flex text-sm font-semibold text-pink-600 transition-colors hover:text-pink-700"
				>
					Read the privacy page
				</a>
			</div>
		</div>
	</div>
</PageLayout>
