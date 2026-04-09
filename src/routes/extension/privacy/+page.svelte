<script>
	import { PageLayout } from '$lib/components/layout';
</script>

<PageLayout
	title="TalkType Extension Privacy"
	description="Privacy details for the TalkType Chrome extension."
>
	<div class="w-full max-w-3xl space-y-5 text-gray-800">
		<div class="space-y-3 text-center">
			<p class="text-xs font-black uppercase tracking-[0.2em] text-pink-500">Privacy</p>
			<h1 class="text-4xl font-black tracking-tight sm:text-5xl">TalkType Extension Privacy</h1>
			<p class="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
				The extension is intentionally simple: your audio goes to Google for transcription, your key
				stays in Chrome storage, and TalkType does not run its own middleware for the extension.
			</p>
		</div>

		<div class="space-y-4 rounded-[2rem] border border-pink-200 bg-white/90 p-6 shadow-md">
			<section class="space-y-2">
				<h2 class="text-xl font-black">What the extension accesses</h2>
				<p class="text-sm leading-relaxed text-gray-700 sm:text-base">
					TalkType requests microphone access so it can record speech when you explicitly start a
					recording. It also uses Chrome storage to save your API key, transcription style, and a few
					preferences.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-xl font-black">Where audio goes</h2>
				<p class="text-sm leading-relaxed text-gray-700 sm:text-base">
					Recorded audio is sent directly from the extension to the Gemini API using the API key you
					provide. The extension does not send audio through a TalkType-operated server first.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-xl font-black">What TalkType stores</h2>
				<p class="text-sm leading-relaxed text-gray-700 sm:text-base">
					The extension stores your Gemini API key, transcription style, site preferences, theme
					preference, and microphone permission status in Chrome’s synced extension storage.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-xl font-black">What TalkType does not do</h2>
				<ul class="space-y-2 text-sm leading-relaxed text-gray-700 sm:text-base">
					<li>It does not create a TalkType account for you.</li>
					<li>It does not run analytics or telemetry for the extension.</li>
					<li>It does not keep a TalkType-hosted transcript history for the extension.</li>
					<li>It does not sell your data.</li>
				</ul>
			</section>

			<section class="space-y-2">
				<h2 class="text-xl font-black">Control</h2>
				<p class="text-sm leading-relaxed text-gray-700 sm:text-base">
					You can remove the extension at any time, revoke microphone access in Chrome, and delete
					stored settings from the extension options or Chrome’s extension settings.
				</p>
			</section>
		</div>
	</div>
</PageLayout>
