<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
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
	import { polishAudioBlob } from '$lib/services/audio/audioPolish.js';
	import { soundService } from '$lib/services/infrastructure/soundService.js';
	import { typewriterSoundService } from '$lib/services/infrastructure/typewriterSoundService.js';
	import { transcriptionService } from '$lib/services/transcription/transcriptionService.js';
	import {
		cleanTranscriptText,
		getTranscriptWordCount,
		insertPlainTranscriptTextIntoControl,
		normalizeTranscriptText
	} from '$lib/utils/transcriptText.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';

	import { userPreferences } from '$lib/services/infrastructure/stores';
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
	let polishingId = null;
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
	const iconButtonClass =
		'btn btn-ghost h-11 min-h-11 w-11 px-0 text-base transition-colors duration-150';
	// Secondary actions stay borderless — the transcript should be the loudest
	// thing in the row, not the chrome around it.
	const menuButtonClass =
		'inline-flex min-h-11 items-center rounded-full px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors duration-150 hover:bg-pink-50 hover:text-pink-700 active:bg-pink-100 active:scale-95';

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

	// Copy transcript to clipboard. The toast lands at the bottom of the screen,
	// which in a scrolled list is nowhere near the thumb — so the button itself
	// confirms too, at the point of contact.
	let copiedId = null;
	let copiedTimer = null;

	// wordCount has been stored on every transcript for ages; older rows predate
	// the field, so fall back to counting the text we already have.
	function wordCountOf(transcript) {
		return transcript.wordCount ?? getTranscriptWordCount(transcript.text);
	}

	async function copyTranscript(text, id = null) {
		const normalizedText = cleanTranscriptText(text);
		if (!normalizedText) {
			showToast('Nothing to copy.', 'info');
			return;
		}

		const copied = await transcriptionService.copyToClipboard(normalizedText, {
			showSuccess: false
		});
		if (copied && id) {
			clearTimeout(copiedTimer);
			copiedId = id;
			copiedTimer = setTimeout(() => (copiedId = null), 1400);
		}
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

	function saveBlob(blob, filename) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Download single transcript as text file
	function downloadTranscript(transcript) {
		const blob = new Blob([normalizeTranscriptText(transcript.text)], { type: 'text/plain' });
		saveBlob(blob, `transcript-${new Date(transcript.timestamp).toISOString().slice(0, 10)}.txt`);
	}

	function audioExt(type) {
		if (!type) return 'webm';
		if (type.includes('mp4')) return 'm4a';
		if (type.includes('ogg')) return 'ogg';
		if (type.includes('wav')) return 'wav';
		return 'webm';
	}

	// "talk-aug7-230pm" — friendly but shell-safe: no spaces, no stray dots.
	function audioStamp(transcript) {
		const d = new Date(transcript.timestamp);
		const mon = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
		let h = d.getHours();
		const ampm = h >= 12 ? 'pm' : 'am';
		h = h % 12 || 12;
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${mon}${d.getDate()}-${h}${min}${ampm}`;
	}

	// One button, no decisions: "Save audio" quietly runs the 80/20 mastering
	// pass (audioPolish) and hands back a clean WAV. People don't need to know
	// there was ever a rough version. If the render fails, the original goes
	// out instead — polish never stands between someone and their recording.
	async function downloadAudio(transcript) {
		if (polishingId) return;
		polishingId = transcript.id;
		try {
			const wav = await polishAudioBlob(transcript.audioBlob);
			saveBlob(wav, `talk-${audioStamp(transcript)}.wav`);
		} catch (err) {
			console.error('Audio polish failed, downloading original:', err);
			saveBlob(
				transcript.audioBlob,
				`talk-${audioStamp(transcript)}.${audioExt(transcript.audioBlob.type)}`
			);
		} finally {
			polishingId = null;
		}
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
		<div class="mb-4 shrink-0 border-b border-pink-100 pb-4">
			<!-- Title row keeps pr-10 so it never collides with the absolute close
			     button; actions live on their own full-width row below. -->
			<div class="flex flex-col gap-3">
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
					<div class="flex flex-wrap items-center gap-2">
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
							class={`${menuButtonClass} ${confirmClearAll ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200' : ''}`}
							on:click={handleClearAll}
							aria-label={confirmClearAll
								? 'Tap again to clear transcript history'
								: 'Clear transcript history'}
						>
							{confirmClearAll ? 'Tap again' : 'Clear'}
						</button>
					</div>
					{#if isSupporter && showExportFormats}
						<div class="flex flex-wrap gap-2" transition:fade={{ duration: 150 }}>
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
					class={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold transition-all duration-150 ${
						!selectedTag
							? 'border-pink-300 bg-pink-50 text-pink-800'
							: 'border-pink-100 bg-white/75 text-gray-600 hover:bg-pink-50 active:scale-95'
					}`}
					aria-pressed={!selectedTag}
					on:click={() => (selectedTag = '')}
				>
					All
				</button>
				{#each availableTags.slice(0, 14) as tag}
					<button
						type="button"
						class={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold transition-all duration-150 ${
							selectedTag === tag
								? 'border-pink-300 bg-pink-50 text-pink-800'
								: 'border-pink-100 bg-white/75 text-gray-600 hover:bg-pink-50 active:scale-95'
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
				<div class="py-16 text-center">
					<p class="mb-3 text-5xl opacity-25" aria-hidden="true">📝</p>
					<p class="text-base font-bold text-gray-600">Nothing saved yet</p>
					<p class="mt-2 text-sm leading-relaxed text-gray-500">
						Transcripts and audio will save here<br />— on this device only.
					</p>
				</div>
			{:else if visibleTranscripts.length === 0}
				<div class="py-16 text-center">
					<p class="mb-3 text-5xl opacity-25" aria-hidden="true">🔎</p>
					<p class="text-base font-bold text-gray-600">No transcripts with #{selectedTag}</p>
					<button
						type="button"
						class="btn mt-6 min-h-12 border-pink-200 bg-pink-50/80 px-6 text-sm font-bold text-pink-700 hover:bg-pink-100 active:scale-95"
						on:click={() => (selectedTag = '')}
					>
						Show all
					</button>
				</div>
			{:else}
				<!-- Transcript List -->
				<div class="space-y-4">
					{#each visibleTranscripts as transcript (transcript.id)}
						<div
							class="group rounded-xl border-2 border-pink-100 bg-white/50 p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
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
										<!-- Stored on every transcript and shown nowhere until now. -->
										{#if wordCountOf(transcript) > 0}
											<span
												class="text-xs font-medium tabular-nums text-gray-400"
												title="Words in this transcript"
											>
												{wordCountOf(transcript)}
												{wordCountOf(transcript) === 1 ? 'word' : 'words'}
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
													class={`rounded-full border px-2 py-1 text-[10px] font-bold transition-all duration-150 ${
														selectedTag === tag
															? 'border-pink-300 bg-pink-50 text-pink-800'
															: 'border-pink-100 bg-white/80 text-gray-500 hover:bg-pink-50 active:scale-95'
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
								<div class="flex shrink-0 items-center gap-2 self-start">
									{#if editingId !== transcript.id}
										{#if transcript.audioBlob}
											<button
												type="button"
												class={`${iconButtonClass} ${activeAudioId === transcript.id ? 'bg-pink-100 text-pink-700 hover:bg-pink-100' : 'hover:bg-pink-50 active:scale-95 active:bg-pink-100'}`}
												on:click={() => toggleAudioPlayer(transcript)}
												title={activeAudioId === transcript.id ? 'Hide player' : 'Play audio'}
												aria-expanded={activeAudioId === transcript.id}
												aria-label={activeAudioId === transcript.id
													? `Hide audio player for ${formatDate(transcript.timestamp)}`
													: `Play audio from ${formatDate(transcript.timestamp)}`}
											>
												<span class="text-base" aria-hidden="true"
													>{activeAudioId === transcript.id ? '⏸' : '▶'}</span
												>
											</button>
										{/if}
										<!-- Same ghost chip as the main transcript's copy button, so
										     "copy" looks like one thing across the whole app. -->
										<button
											type="button"
											class="history-copy-chip h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-pink-100 to-purple-50 p-1 shadow-sm ring-1 ring-pink-200/70 transition-transform duration-200 hover:scale-105 hover:shadow-md active:scale-95"
											class:is-copied={copiedId === transcript.id}
											on:click={() => copyTranscript(transcript.text, transcript.id)}
											aria-label={`Copy transcript from ${formatDate(transcript.timestamp)}`}
											title={copiedId === transcript.id ? 'Copied' : 'Copy'}
										>
											{#if copiedId === transcript.id}
												<span class="copy-tick" aria-hidden="true">✓</span>
											{:else}
												<span class="block h-full w-full p-0.5">
													<DisplayGhost theme={$theme} size="100%" disableJsAnimation={true} />
												</span>
											{/if}
										</button>
										<button
											type="button"
											class={`${iconButtonClass} ${openMenuId === transcript.id ? 'bg-pink-100 text-pink-700 hover:bg-pink-100' : 'hover:bg-pink-50 active:scale-95 active:bg-pink-100'}`}
											on:click={() => toggleMenu(transcript.id)}
											aria-expanded={openMenuId === transcript.id}
											aria-label={`More actions for transcript from ${formatDate(transcript.timestamp)}`}
										>
											<span class="text-lg" aria-hidden="true">⋯</span>
										</button>
									{/if}
								</div>
							</div>

							{#if openMenuId === transcript.id && editingId !== transcript.id}
								<div
									class="mb-3 flex flex-wrap gap-2 border-t border-pink-100 pt-3"
									transition:fade={{ duration: 150 }}
								>
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
									{#if transcript.audioBlob}
										<button
											type="button"
											class={`${menuButtonClass} transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50`}
											disabled={polishingId === transcript.id}
											on:click={() => downloadAudio(transcript)}
										>
											{polishingId === transcript.id ? 'Saving…' : 'Save audio'}
										</button>
									{/if}
									<button
										type="button"
										class={`${menuButtonClass} ${pendingDeleteId === transcript.id ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 active:bg-pink-300' : 'text-pink-700 hover:bg-pink-50'}`}
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
								<div
									class="mb-3 rounded-xl border-2 border-pink-200 bg-[#fffdf5] p-3 shadow-inner"
									transition:fade={{ duration: 150 }}
								>
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
											class="btn min-h-12 border-pink-100 bg-white/80 px-6 text-sm font-semibold text-gray-700 transition-all duration-150 hover:bg-pink-50 active:scale-95"
											on:click={cancelEdit}
										>
											Cancel
										</button>
										<button
											type="button"
											class="btn min-h-12 border-pink-200 bg-pink-500 px-6 text-sm font-bold text-white transition-all duration-150 hover:border-pink-300 hover:bg-pink-600 active:scale-95 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:active:scale-100"
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
						{$transcriptHistory.length >= HISTORY.FREE_HISTORY_LIMIT
							? `Your latest ${HISTORY.FREE_HISTORY_LIMIT} — the oldest makes way when a new one lands.`
							: `Keeping your latest ${HISTORY.FREE_HISTORY_LIMIT}.`}
						<!-- No price here on purpose: the nudge alludes warmly, the
						     supporter modal does the actual asking. -->
						<button
							type="button"
							class="font-bold text-pink-500 underline decoration-pink-200 underline-offset-2 hover:text-pink-600"
							on:click={openSupporterModal}
						>
							Supporters keep every single one.
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

	/* The inner frame must NOT contain. It used to, while the outer list did not,
	   so a gesture starting on a long transcript refused to hand off to the modal
	   — and a short one (not scrollable) propagated fine. That flipped the
	   behaviour per row depending on text length. Containment belongs on the
	   outermost scroller in the stack, which is the list. */
	.history-transcript-frame {
		scrollbar-gutter: stable;
		-webkit-overflow-scrolling: touch;
	}

	.tt-modal-scroll-area {
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}

	.history-copy-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.history-copy-chip.is-copied {
		background: linear-gradient(135deg, #fce7f3, #fbcfe8);
		transition: background 200ms ease;
	}

	.copy-tick {
		font-size: 1.1rem;
		font-weight: 700;
		line-height: 1;
		color: #be185d;
		animation: tick-appear 200ms ease;
	}

	@keyframes tick-appear {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
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
