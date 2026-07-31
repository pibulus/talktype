<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import {
		transcriptHistory,
		loadAllTranscripts,
		updateTranscript,
		deleteTranscript,
		clearAllTranscripts,
		batchDownloadTranscripts,
		exportAllTranscriptsJSON,
		exportAllTranscriptsMarkdown
	} from '$lib/services/storage/transcriptStorage';
	import { autoBackupHistoryToVault } from '$lib/services/storage/vaultAutoBackup.js';
	import { ModalCloseButton } from '$lib/components/modals/index.js';
	import {
		cleanTranscriptTags,
		getTranscriptTagPool
	} from '$lib/services/storage/transcriptTags.js';
	import { formatDuration } from '$lib/components/audio/recordButtonState.js';
	import { soundService } from '$lib/services/infrastructure/soundService.js';
	import { typewriterSoundService } from '$lib/services/infrastructure/typewriterSoundService.js';
	import { transcriptionService } from '$lib/services/transcription/transcriptionService.js';
	import {
		cleanTranscriptText,
		insertPlainTranscriptTextIntoControl,
		normalizeTranscriptText
	} from '$lib/utils/transcriptText.js';

	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { PRICING } from '$lib/config/pricing.js';
	import { HISTORY } from '$lib/constants';

	export let closeModal = () => {};

	const TYPEWRITER_INPUT_GUARD_MS = 34;

	// Supporter status check
	$: isSupporter = $userPreferences.isSupporter;

	function openSupporterModal() {
		closeModal();
		if (supporterOpenTimeout) clearTimeout(supporterOpenTimeout);
		supporterOpenTimeout = setTimeout(() => {
			supporterOpenTimeout = null;
			window.dispatchEvent(new CustomEvent('talktype:open-supporter-modal'));
		}, 75);
	}

	let confirmClearAll = false;
	let pendingDeleteId = null;
	let editingId = null;
	let editText = '';
	let clearAllTimeout = null;
	let deleteConfirmTimeout = null;
	let supporterOpenTimeout = null;
	let activeAudioId = null;
	let activeAudioUrl = '';
	let selectedTag = '';
	let editTextarea;
	let openMenuId = null;
	let showExportFormats = false;
	let lastTypewriterInputAt = 0;
	const iconButtonClass = 'btn btn-ghost h-12 min-h-12 w-12 px-0 text-base';
	// Secondary actions stay borderless — the transcript should be the loudest
	// thing in the row, not the chrome around it.
	const menuButtonClass =
		'inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-gray-600 transition hover:bg-pink-50 hover:text-pink-700';

	function toggleMenu(id) {
		openMenuId = openMenuId === id ? null : id;
		if (openMenuId !== id) pendingDeleteId = null;
	}

	$: availableTags = getTranscriptTagPool($transcriptHistory);
	$: visibleTranscripts = selectedTag
		? $transcriptHistory.filter((transcript) =>
				cleanTranscriptTags(transcript.tags || []).includes(selectedTag)
			)
		: $transcriptHistory;
	$: if (selectedTag && !availableTags.includes(selectedTag)) {
		selectedTag = '';
	}
	$: editTextReady = cleanTranscriptText(editText).length > 0;

	// Format timestamp to readable date
	function formatDate(timestamp) {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now - date;

		// Less than 1 minute
		if (diff < 60000) {
			return 'Just now';
		}

		// Less than 1 hour
		if (diff < 3600000) {
			const mins = Math.floor(diff / 60000);
			return `${mins} minute${mins > 1 ? 's' : ''} ago`;
		}

		// Less than 24 hours
		if (diff < 86400000) {
			const hours = Math.floor(diff / 3600000);
			return `${hours} hour${hours > 1 ? 's' : ''} ago`;
		}

		// Otherwise show date
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function formatPromptStyle(style) {
		const labels = {
			custom: 'Custom',
			leetSpeak: 'L33t',
			quillAndInk: 'Victorian',
			sparklePop: 'Sparkle',
			surlyPirate: 'Pirate'
		};

		return labels[style] || style;
	}

	function toggleTag(tag) {
		selectedTag = selectedTag === tag ? '' : tag;
	}

	function mirrorHistoryToVault() {
		void autoBackupHistoryToVault({ allowEmptyHistory: true });
	}

	// Copy transcript to clipboard
	async function copyTranscript(text) {
		const normalizedText = cleanTranscriptText(text);
		if (!normalizedText) {
			showToast('Nothing to copy.', 'info');
			return;
		}

		const copied = await transcriptionService.copyToClipboard(normalizedText, {
			showSuccess: false
		});
		showToast(copied ? 'Copied' : 'Tap the page, then try copy.', copied ? 'success' : 'info');
	}

	// Share single transcript via the native share sheet (mobile's "send to
	// Notes/Messages" path). Falls back to clipboard inside the service.
	async function shareTranscriptItem(transcript) {
		const text = cleanTranscriptText(transcript.text);
		if (!text) {
			showToast('Nothing to share.', 'info');
			return;
		}
		await transcriptionService.shareTranscript(text);
	}

	// Download single transcript as text file
	function downloadTranscript(transcript) {
		const blob = new Blob([normalizeTranscriptText(transcript.text)], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `transcript-${new Date(transcript.timestamp).toISOString().slice(0, 10)}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Start editing a transcript
	function startEdit(transcript) {
		openMenuId = null;
		editingId = transcript.id;
		editText = normalizeTranscriptText(transcript.text);
		tick().then(() => {
			editTextarea?.focus();
			syncEditTextareaHeight();
		});
	}

	// Save edited transcript
	async function saveEdit(id) {
		const nextText = cleanTranscriptText(editText);
		if (!nextText) {
			showToast('Add some text or cancel the edit.', 'info');
			return;
		}

		// Pass the existing tags through — otherwise updateTranscript regenerates
		// them and quietly discards any hand-curated ones. try/catch because it
		// rejects (not returns false) when the record vanished, e.g. trimmed out
		// from under the editor on the free tier.
		const existing = $transcriptHistory.find((t) => t.id === id);
		let updated = false;
		try {
			updated = await updateTranscript(id, nextText, {
				tags: existing?.tags?.length ? existing.tags : undefined
			});
		} catch {
			updated = false;
		}
		if (!updated) {
			showToast('Transcript update needs one more try.', 'info');
			return;
		}

		editingId = null;
		editText = '';
		mirrorHistoryToVault();
		showToast('Transcript updated.', 'success');
	}

	// Cancel editing
	function cancelEdit() {
		editingId = null;
		editText = '';
	}

	function requestDelete(id) {
		pendingDeleteId = id;
		if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
		deleteConfirmTimeout = setTimeout(() => {
			if (pendingDeleteId === id) pendingDeleteId = null;
			deleteConfirmTimeout = null;
		}, 3000);
	}

	async function confirmDelete(id) {
		if (activeAudioId === id) {
			clearActiveAudio();
		}

		await deleteTranscript(id);
		pendingDeleteId = null;
		mirrorHistoryToVault();

		showToast('Transcript removed from history.', 'info');
	}

	// Clear all transcripts
	async function handleClearAll() {
		if (!confirmClearAll) {
			confirmClearAll = true;
			if (clearAllTimeout) clearTimeout(clearAllTimeout);
			clearAllTimeout = setTimeout(() => {
				confirmClearAll = false;
				clearAllTimeout = null;
			}, 3000);
			return;
		}

		clearActiveAudio();
		await clearAllTranscripts();
		confirmClearAll = false;
		mirrorHistoryToVault();

		showToast('History cleared.', 'info');
	}

	// Play audio (if available)
	function clearActiveAudio() {
		if (activeAudioUrl) {
			URL.revokeObjectURL(activeAudioUrl);
		}

		activeAudioId = null;
		activeAudioUrl = '';
	}

	function toggleAudioPlayer(transcript) {
		if (!transcript?.audioBlob) return;

		if (activeAudioId === transcript.id) {
			clearActiveAudio();
			return;
		}

		clearActiveAudio();
		activeAudioId = transcript.id;
		activeAudioUrl = URL.createObjectURL(transcript.audioBlob);
	}

	// Batch download all transcripts as one ZIP
	async function handleBatchDownload() {
		const count = await batchDownloadTranscripts();
		showToast(`Zipped ${count} transcript${count !== 1 ? 's' : ''} for download.`, 'success');
	}

	// Export as JSON
	async function handleExportJSON() {
		await exportAllTranscriptsJSON();
		showToast('Exported as JSON.', 'success');
	}

	// Export everything as one Markdown file
	async function handleExportMarkdown() {
		const exported = await exportAllTranscriptsMarkdown();
		showToast(exported ? 'Exported as Markdown.' : 'Nothing to export yet.', 'success');
	}

	function showToast(message, type = 'info') {
		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message, type }
			})
		);
	}

	function getTypewriterEventTime() {
		return browser && window.performance?.now ? window.performance.now() : Date.now();
	}

	function canPlayTypewriterSound() {
		return browser && editingId && soundService.isEnabled();
	}

	function warmTypewriterSounds() {
		if (!canPlayTypewriterSound()) return;
		typewriterSoundService.prime().catch(() => {});
	}

	function handleEditKeydown(event) {
		if (!canPlayTypewriterSound()) return;
		if (!typewriterSoundService.isEditKeyEvent(event)) return;

		lastTypewriterInputAt = getTypewriterEventTime();
		typewriterSoundService.playFromKeyboardEvent(event).catch(() => {});
	}

	function handleEditBeforeInput(event) {
		if (!canPlayTypewriterSound()) return;

		const now = getTypewriterEventTime();
		if (now - lastTypewriterInputAt < TYPEWRITER_INPUT_GUARD_MS) return;
		if (!typewriterSoundService.isSupportedInputEvent(event)) return;

		lastTypewriterInputAt = now;
		typewriterSoundService.playFromInputEvent(event).catch(() => {});
	}

	function handleEditPaste(event) {
		const text = event.clipboardData?.getData('text/plain');
		if (typeof text !== 'string') return;

		event.preventDefault();
		const nextValue = insertPlainTranscriptTextIntoControl(event.currentTarget, text);
		if (nextValue !== null) {
			editText = nextValue;
			tick().then(syncEditTextareaHeight);
		}
	}

	function syncEditTextareaHeight() {
		if (!editTextarea) return;

		editTextarea.style.height = 'auto';
		const maxHeight = browser ? Math.max(180, window.innerHeight * 0.42) : 320;
		editTextarea.style.height = `${Math.min(editTextarea.scrollHeight, maxHeight)}px`;
	}

	onMount(() => {
		loadAllTranscripts();
	});

	onDestroy(() => {
		if (clearAllTimeout) clearTimeout(clearAllTimeout);
		if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
		if (supporterOpenTimeout) clearTimeout(supporterOpenTimeout);
		clearActiveAudio();
	});
</script>

<dialog
	id="history_modal"
	class="modal"
	aria-labelledby="history_modal_title"
	aria-describedby="history_modal_description"
	aria-modal="true"
>
	<div class="tt-modal-lg tt-modal-contained modal-box relative">
		<form method="dialog">
			<ModalCloseButton
				closeModal={() => closeModal()}
				label="Close history"
				position="right-2 top-2"
				modalId="history_modal"
			/>
		</form>

		<!-- Header -->
		<div class="mb-4 shrink-0 border-b border-pink-100 pb-3">
			<!-- Title row keeps pr-10 so it never collides with the absolute close
			     button; actions live on their own full-width row below. -->
			<div class="flex flex-col gap-1">
				<div class="flex items-start justify-between gap-2 pr-10">
					<div>
						<h3 id="history_modal_title" class="text-xl font-black tracking-tight text-gray-800">
							Transcript History
						</h3>
						<p id="history_modal_description" class="sr-only">Your saved transcripts.</p>
						{#if selectedTag}
							<p class="text-xs text-gray-500">#{selectedTag}</p>
						{/if}
					</div>
				</div>

				{#if $transcriptHistory.length > 0}
					<div class="flex flex-wrap items-center gap-1">
						{#if isSupporter}
							<button
								type="button"
								class={menuButtonClass}
								on:click={handleBatchDownload}
								aria-label="Download all transcripts as a ZIP of text files"
							>
								Export all
							</button>
							<button
								type="button"
								class={menuButtonClass}
								on:click={() => (showExportFormats = !showExportFormats)}
								aria-expanded={showExportFormats}
								aria-label="Other export formats"
							>
								<span aria-hidden="true">⋯</span>
							</button>
						{/if}
						<button
							type="button"
							class={menuButtonClass}
							on:click={handleClearAll}
							aria-label={confirmClearAll
								? 'Tap again to clear transcript history'
								: 'Clear transcript history'}
						>
							{confirmClearAll ? 'Tap again' : 'Clear'}
						</button>
					</div>
					{#if isSupporter && showExportFormats}
						<div class="flex flex-wrap gap-2">
							<button type="button" class={menuButtonClass} on:click={handleExportMarkdown}>
								One Markdown file
							</button>
							<button type="button" class={menuButtonClass} on:click={handleExportJSON}>
								JSON
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>

		{#if isSupporter && availableTags.length > 0 && $transcriptHistory.length > 0}
			<div
				class="tt-scrollbar-x mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1"
				role="group"
				aria-label="Filter history by tag"
			>
				<button
					type="button"
					class={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors duration-150 ${
						!selectedTag
							? 'border-pink-300 bg-pink-50 text-pink-800'
							: 'border-pink-100 bg-white/75 text-gray-600 hover:bg-pink-50'
					}`}
					aria-pressed={!selectedTag}
					on:click={() => (selectedTag = '')}
				>
					All
				</button>
				{#each availableTags.slice(0, 14) as tag}
					<button
						type="button"
						class={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors duration-150 ${
							selectedTag === tag
								? 'border-pink-300 bg-pink-50 text-pink-800'
								: 'border-pink-100 bg-white/75 text-gray-600 hover:bg-pink-50'
						}`}
						aria-pressed={selectedTag === tag}
						on:click={() => toggleTag(tag)}
					>
						#{tag}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Content -->
		<div class="tt-modal-scroll-area min-h-0 flex-1 overflow-y-auto">
			{#if $transcriptHistory.length === 0}
				<!-- Empty State -->
				<div class="py-12 text-center">
					<p class="mb-2 text-4xl opacity-30" aria-hidden="true">📝</p>
					<p class="text-sm text-gray-500">Nothing saved yet</p>
				</div>
			{:else if visibleTranscripts.length === 0}
				<div class="py-12 text-center">
					<p class="mb-2 text-4xl opacity-30" aria-hidden="true">🔎</p>
					<p class="text-sm text-gray-500">No transcripts with #{selectedTag}</p>
					<button
						type="button"
						class="btn mt-4 min-h-11 border-pink-100 bg-white/80 px-4 text-sm text-gray-700 hover:bg-pink-50"
						on:click={() => (selectedTag = '')}
					>
						Show all
					</button>
				</div>
			{:else}
				<!-- Transcript List -->
				<div class="space-y-3">
					{#each visibleTranscripts as transcript (transcript.id)}
						<div
							class="group rounded-lg border border-pink-100 bg-white/50 p-3 shadow-sm transition-all hover:shadow-md"
						>
							<!-- Header -->
							<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span class="text-xs font-medium text-gray-500">
											{formatDate(transcript.timestamp)}
										</span>
										<!-- Guarded on > 0: entries saved before 2026-07-31 have no
										     duration, because nothing ever filled the field. Showing
										     "0:00" on old clips would look like a bug. -->
										{#if transcript.duration > 0}
											<span
												class="text-xs font-medium tabular-nums text-gray-400"
												title="How long this recording ran"
											>
												{formatDuration(transcript.duration)}
											</span>
										{/if}
										{#if transcript.promptStyle && transcript.promptStyle !== 'standard'}
											<span
												class="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-medium text-pink-700"
											>
												{formatPromptStyle(transcript.promptStyle)}
											</span>
										{/if}
									</div>
									{#if transcript.tags?.length}
										<div class="mt-2 flex flex-wrap gap-1.5">
											{#each cleanTranscriptTags(transcript.tags).slice(0, 5) as tag}
												<button
													type="button"
													class={`rounded-full border px-2 py-1 text-[10px] font-bold transition-colors duration-150 ${
														selectedTag === tag
															? 'border-pink-300 bg-pink-50 text-pink-800'
															: 'border-pink-100 bg-white/80 text-gray-500 hover:bg-pink-50'
													}`}
													aria-pressed={selectedTag === tag}
													on:click={() => toggleTag(tag)}
												>
													#{tag}
												</button>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Actions. Copy is the whole job 95% of the time; everything
								     else lives one tap deeper so a long list stays readable. -->
								<div class="flex shrink-0 items-center gap-1 self-start">
									{#if editingId !== transcript.id}
										{#if transcript.audioBlob}
											<button
												type="button"
												class={`${iconButtonClass} ${activeAudioId === transcript.id ? 'bg-pink-50 text-pink-700' : ''}`}
												on:click={() => toggleAudioPlayer(transcript)}
												title={activeAudioId === transcript.id ? 'Hide player' : 'Play audio'}
												aria-expanded={activeAudioId === transcript.id}
												aria-label={activeAudioId === transcript.id
													? `Hide audio player for ${formatDate(transcript.timestamp)}`
													: `Play audio from ${formatDate(transcript.timestamp)}`}
											>
												<span aria-hidden="true"
													>{activeAudioId === transcript.id ? '⏸' : '▶'}</span
												>
											</button>
										{/if}
										<button
											type="button"
											class="inline-flex min-h-11 items-center justify-center rounded-full bg-white/70 px-4 text-sm font-bold text-pink-600 ring-1 ring-pink-200 transition hover:bg-pink-50 active:scale-[0.97]"
											on:click={() => copyTranscript(transcript.text)}
											aria-label={`Copy transcript from ${formatDate(transcript.timestamp)}`}
										>
											Copy
										</button>
										<button
											type="button"
											class={`${iconButtonClass} ${openMenuId === transcript.id ? 'bg-pink-50 text-pink-700' : ''}`}
											on:click={() => toggleMenu(transcript.id)}
											aria-expanded={openMenuId === transcript.id}
											aria-label={`More actions for transcript from ${formatDate(transcript.timestamp)}`}
										>
											<span aria-hidden="true">⋯</span>
										</button>
									{/if}
								</div>
							</div>

							{#if openMenuId === transcript.id && editingId !== transcript.id}
								<div class="mb-2 flex flex-wrap gap-2 border-t border-pink-100 pt-2">
									<button
										type="button"
										class={menuButtonClass}
										on:click={() => startEdit(transcript)}
									>
										Edit
									</button>
									{#if transcriptionService.isShareSupported()}
										<button
											type="button"
											class={menuButtonClass}
											on:click={() => shareTranscriptItem(transcript)}
										>
											Share
										</button>
									{/if}
									<button
										type="button"
										class={menuButtonClass}
										on:click={() => downloadTranscript(transcript)}
									>
										Download
									</button>
									<button
										type="button"
										class={`${menuButtonClass} text-pink-700`}
										on:click={() =>
											pendingDeleteId === transcript.id
												? confirmDelete(transcript.id)
												: requestDelete(transcript.id)}
									>
										{pendingDeleteId === transcript.id ? 'Tap again' : 'Remove'}
									</button>
								</div>
							{/if}

							{#if activeAudioId === transcript.id && activeAudioUrl}
								<div class="mb-2 rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-inner">
									<audio
										class="history-audio-player w-full"
										src={activeAudioUrl}
										controls
										autoplay
										preload="metadata"
										aria-label={`Recording audio from ${formatDate(transcript.timestamp)}`}
									></audio>
								</div>
							{/if}

							<!-- Transcript Text -->
							{#if editingId === transcript.id}
								<!-- Edit Mode -->
								<div class="space-y-2">
									<textarea
										bind:this={editTextarea}
										bind:value={editText}
										class="history-edit-textarea tt-scrollbar w-full resize-y rounded-xl border border-pink-200 bg-white/95 px-3 py-3 text-base text-gray-800 shadow-inner transition-all duration-150 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
										rows="5"
										aria-label="Edit transcript text"
										on:pointerdown={warmTypewriterSounds}
										on:focus={warmTypewriterSounds}
										on:keydown={handleEditKeydown}
										on:beforeinput={handleEditBeforeInput}
										on:paste={handleEditPaste}
										on:input={syncEditTextareaHeight}
									></textarea>
									<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
										<button
											type="button"
											class="btn min-h-11 border-pink-100 bg-white/80 px-4 text-sm font-semibold text-gray-700 hover:bg-pink-50"
											on:click={cancelEdit}
										>
											Cancel
										</button>
										<button
											type="button"
											class="btn min-h-11 border-pink-200 bg-pink-500 px-4 text-sm font-bold text-white hover:border-pink-300 hover:bg-pink-600 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-400"
											disabled={!editTextReady}
											on:click={() => saveEdit(transcript.id)}
										>
											Save
										</button>
									</div>
								</div>
							{:else}
								<!-- View Mode -->
								<div
									class="history-transcript-frame tt-scrollbar max-h-44 overflow-y-auto sm:max-h-40"
								>
									<p class="history-transcript-text text-sm text-gray-700">
										{normalizeTranscriptText(transcript.text)}
									</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				{#if !isSupporter}
					<!-- Free tier reads everything it keeps — the user's words are never
					     locked. This sits AFTER the list on purpose: the header is for
					     getting to your transcripts, not for being sold to. -->
					<p class="mt-4 px-1 text-center text-xs text-gray-400">
						Keeping your latest {HISTORY.FREE_HISTORY_LIMIT}.
						<button
							type="button"
							class="font-bold text-pink-500 underline decoration-pink-200 underline-offset-2 hover:text-pink-600"
							on:click={openSupporterModal}
						>
							Keep everything for {PRICING.displayPrice}/year
						</button>
					</p>
				{/if}
			{/if}
		</div>
	</div>
	<button type="button" class="modal-backdrop" on:click={closeModal} aria-label="Close history"
	></button>
</dialog>

<style>
	.history-audio-player {
		display: block;
		height: 42px;
		border-radius: 0.75rem;
	}

	.history-transcript-frame {
		scrollbar-gutter: stable;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}

	.history-transcript-text,
	.history-edit-textarea {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		line-height: 1.65;
		letter-spacing: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: normal;
		tab-size: 2;
	}

	.history-edit-textarea {
		min-height: 9rem;
		max-height: 42vh;
		caret-color: rgba(236, 72, 153, 1);
	}

	.history-edit-textarea::selection,
	.history-transcript-text::selection {
		background-color: rgba(236, 72, 153, 0.25);
		color: #111827;
	}

	@media (max-width: 600px) {
		.history-transcript-frame {
			max-height: min(34vh, 15rem);
		}

		.history-edit-textarea {
			min-height: 11rem;
			max-height: 44vh;
			line-height: 1.7;
		}
	}
</style>
