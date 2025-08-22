<script>
	function openSupport() {
		window.open('https://buymeacoffee.com/pablomurdoch', '_blank');
	}

	function openFeedback() {
		window.open('mailto:hello@talktype.app?subject=TalkType%20Feedback', '_blank');
	}
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2">
		<span class="text-lg">💜</span>
		<h3 class="text-sm font-medium uppercase tracking-wider opacity-70">Support</h3>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<button on:click={openSupport} class="btn btn-outline btn-sm hover:btn-primary">
			<span>☕</span>
			<span>Buy Coffee</span>
		</button>

		<button on:click={openFeedback} class="btn btn-outline btn-sm">
			<span>💌</span>
			<span>Feedback</span>
		</button>
	</div>

	<div class="text-center">
		<p class="text-xs opacity-60">Indie app made with love • No subscriptions</p>
	</div>
</div>
