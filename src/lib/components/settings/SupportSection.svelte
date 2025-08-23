<script>
	function openSupport() {
		window.open('https://buymeacoffee.com/pablomurdoch', '_blank');
	}

	function openFeedback() {
		window.open('mailto:hello@talktype.app?subject=TalkType%20Feedback', '_blank');
	}
</script>

<div class="space-y-2">
	<div class="flex gap-2">
		<button
			on:click={openSupport}
			class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 p-2.5 text-sm font-medium text-gray-700 transition-all hover:from-pink-100 hover:to-purple-100"
		>
			<span class="text-base">☕</span>
			<span>Buy Coffee</span>
		</button>

		<button
			on:click={openFeedback}
			class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-pink-200 bg-white p-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-pink-50"
		>
			<span class="text-base">💌</span>
			<span>Feedback</span>
		</button>
	</div>

	<div class="text-center">
		<p class="text-xs text-gray-500">Indie app made with love • No subscriptions</p>
	</div>
</div>