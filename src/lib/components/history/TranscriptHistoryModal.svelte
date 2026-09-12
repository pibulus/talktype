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
		exportAllTranscriptsMarkdown,
		sendTranscriptsToZipList
	} from '$lib/services/storage/transcriptStorage';
	import { autoBackupHistoryToVault } from '$lib/services/storage/vaultAutoBackup.js';
	import { ModalCloseButton } from '$lib/components/modals/index.js';
	import {
		cleanTranscriptTags,
		getTranscriptTagPool
	} from '$lib/services/storage/transcriptTags.js';
	import { formatDuration } from '$lib/components/audio/recordButtonState.js';
	import CutePlayer from '$lib/components/audio/CutePlayer.svelte';
	import { polishAudioBlob } from '$lib/services/audio/audioPolish.js';
	import { soundService } from '$lib/services/infrastructure/soundService.js';
	import { typewriterSoundService } from '$lib/services/infrastructure/typewriterSoundService.js';
	import { simpleHybridService } from '$lib/services/transcription/simpleHybridService.js';
	import { transcriptionService } from '$lib/services/transcription/transcriptionService.js';
	import {
		applyCustomWords,
		getStoredCustomWords
	} from '$lib/services/transcription/transcriptCleanup.js';
	import {
		cleanTranscriptText,
		getTranscriptWordCount,
		insertPlainTranscriptTextIntoControl,
		normalizeTranscriptText
	} from '$lib/utils/transcriptText.js';

	import { privacyMode } from '$lib';
	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { HISTORY, PROMPT_STYLES } from '$lib/constants';

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
	let restyleMenuId = null;
	let retranscribingId = null;
	let retranscribeStyleId = null;
	let showExportFormats = false;
	let lastTypewriterInputAt = 0;
	const menuItemClass =
		'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-gray-700 transition-colors duration-150 hover:bg-pink-50 hover:text-pink-600';
	const destructiveMenuItemClass =
		'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-rose-600 transition-colors duration-150 hover:bg-rose-50 active:bg-rose-100';
	const restyleOptionClass =
		'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-gray-700 transition-colors duration-150 hover:bg-pink-50 hover:text-pink-600';

	const restyleOptions = [
		{ id: PROMPT_STYLES.STANDARD, label: 'Plain', tone: 'text-slate-500' },
		{ id: PROMPT_STYLES.SURLY_PIRATE, label: 'Pirate', tone: 'text-amber-500' },
		{ id: PROMPT_STYLES.QUILL_AND_INK, label: 'Victorian', tone: 'text-violet-500' },
		{ id: PROMPT_STYLES.CUSTOM, label: 'BYO', tone: 'text-pink-500', custom: true }
	];

	function toggleMenu(id) {
		openMenuId = openMenuId === id ? null : id;
		restyleMenuId = null;
		if (openMenuId !== id) pendingDeleteId = null;
	}

	function toggleRestyleMenu(id) {
		restyleMenuId = restyleMenuId === id ? null : id;
		openMenuId = null;
		pendingDeleteId = null;
	}

	function closeFloatingMenus() {
		openMenuId = null;
		restyleMenuId = null;
		pendingDeleteId = null;
	}

	function handleWindowKeydown(event) {
		if (event.key === 'Escape') closeFloatingMenus();
	}

	$: availableTags = getTranscriptTagPool($transcriptHistory);
	// Newest-first is the right default — but the oldest note is the hardest one
	// to reach in a long list, and it was previously unreachable except by scroll.
	let oldestFirst = false;
	$: filteredTranscripts = selectedTag
		? $transcriptHistory.filter((transcript) =>
				cleanTranscriptTags(transcript.tags || []).includes(selectedTag)
			)
		: $transcriptHistory;
	$: visibleTranscripts = oldestFirst ? [...filteredTranscripts].reverse() : filteredTranscripts;
	$: if (selectedTag && !availableTags.includes(selectedTag)) {
		selectedTag = '';
	}
	$: editTextReady = cleanTranscriptText(editText).length > 0;

	function hashString(str) {
		if (str == null) return 0;
		const s = String(str);
		let hash = 0;
		for (let i = 0; i < s.length; i++) {
			hash = (hash << 5) - hash + s.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}

	// Deterministic color styling using the 4 brand ghost palettes (Teal, Purple, Peach, Yellow)
	function getTagPillClass(tag, isSelected = false) {
		if (isSelected) {
			return 'bg-gray-900 text-white border-2 border-gray-900 shadow-[2px_2px_0px_#ff82ca] font-black';
		}
		const colorIndex = hashString(tag) % 4;
		const palette = [
			'bg-teal-100 text-teal-950 border-2 border-teal-400 hover:border-gray-900 hover:shadow-[2px_2px_0px_#2dd4bf]',
			'bg-purple-100 text-purple-950 border-2 border-purple-400 hover:border-gray-900 hover:shadow-[2px_2px_0px_#c084fc]',
			'bg-pink-100 text-pink-950 border-2 border-pink-400 hover:border-gray-900 hover:shadow-[2px_2px_0px_#ff82ca]',
			'bg-amber-100 text-amber-950 border-2 border-amber-400 hover:border-gray-900 hover:shadow-[2px_2px_0px_#facc15]'
		];
		return palette[colorIndex];
	}

	function getCardVibeTabClass(transcript) {
		if (transcript.promptStyle === 'surly_pirate') return 'border-l-amber-400';
		if (transcript.promptStyle === 'quill_and_ink') return 'border-l-purple-400';
		if (transcript.promptStyle === 'custom') return 'border-l-teal-400';
		const colorIndex = hashString(transcript.id) % 4;
		const colors = [
			'border-l-pink-400',
			'border-l-teal-400',
			'border-l-purple-400',
			'border-l-amber-400'
		];
		return colors[colorIndex];
	}

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
		// Retired styles keep their labels: old entries were saved under them and
		// should not suddenly display a raw id.
		const labels = {
			custom: 'Custom',
			codeWhisperer: 'Code',
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

	// Styled takes that also kept their plain words can be flipped between the
	// two. Set of ids currently showing the original.
	let showingOriginal = new Set();

	function hasOriginal(transcript) {
		const original = normalizeTranscriptText(transcript?.originalText || '');
		return Boolean(original) && original !== normalizeTranscriptText(transcript.text);
	}

	function toggleOriginal(id) {
		// Reassign — Svelte does not track Set mutation.
		const next = new Set(showingOriginal);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		showingOriginal = next;
	}

	// Only for handlers (copy/share/download) — the markup inlines the same
	// choice so Svelte can see showingOriginal as a dependency.
	function displayedText(transcript) {
		return normalizeTranscriptText(
			showingOriginal.has(transcript.id) ? transcript.originalText : transcript.text
		);
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
		const text = cleanTranscriptText(displayedText(transcript));
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
		// Revoking in the same tick can cancel the download in Safari and Firefox,
		// which read the blob after the click returns. One tick is enough.
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}

	// Download single transcript as text file
	function downloadTranscript(transcript) {
		const blob = new Blob([displayedText(transcript)], { type: 'text/plain' });
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

	function isOfflineModeEnabled() {
		return $privacyMode === true || $privacyMode === 'true';
	}

	function getRestyleOriginalText(transcript, promptStyleId) {
		if (promptStyleId === PROMPT_STYLES.STANDARD) return '';
		if (hasOriginal(transcript)) return transcript.originalText;
		if ((transcript.promptStyle || PROMPT_STYLES.STANDARD) === PROMPT_STYLES.STANDARD) {
			return transcript.text;
		}
		return '';
	}

	function restyleOptionHint(option) {
		if (option.custom && !isSupporter) return 'Supporter custom style';
		if (isOfflineModeEnabled() && option.id !== PROMPT_STYLES.STANDARD) {
			return 'Turn off Offline Mode to use cloud styles';
		}
		return `Re-transcribe as ${option.label}`;
	}

	function isRestyleOptionBlocked(option) {
		return (
			(option.custom && !isSupporter) ||
			(isOfflineModeEnabled() && option.id !== PROMPT_STYLES.STANDARD)
		);
	}

	async function handleRestyleOption(transcript, option) {
		if (option.custom && !isSupporter) {
			openSupporterModal();
			return;
		}

		await retranscribeTranscript(transcript, option.id);
	}

	async function retranscribeTranscript(transcript, promptStyleId) {
		if (!transcript?.audioBlob) {
			showToast('No saved audio for this one.', 'info');
			return;
		}
		if (retranscribingId) {
			showToast('Already re-transcribing one.', 'info');
			return;
		}
		if (isOfflineModeEnabled() && promptStyleId !== PROMPT_STYLES.STANDARD) {
			showToast('Turn off Offline Mode to restyle from history.', 'info');
			return;
		}

		retranscribingId = transcript.id;
		retranscribeStyleId = promptStyleId;
		openMenuId = null;
		restyleMenuId = null;
		pendingDeleteId = null;

		try {
			const nextText = await simpleHybridService.transcribeAudio(transcript.audioBlob, {
				promptStyle: promptStyleId,
				durationSeconds: transcript.duration || undefined
			});
			const finalText = cleanTranscriptText(applyCustomWords(nextText, getStoredCustomWords()));
			if (!finalText) throw new Error('Re-transcription came back empty.');

			const updated = await updateTranscript(transcript.id, finalText, {
				tags: transcript.tags,
				promptStyle: promptStyleId,
				originalText: getRestyleOriginalText(transcript, promptStyleId),
				method:
					isOfflineModeEnabled() && promptStyleId === PROMPT_STYLES.STANDARD
						? 'whisper'
						: 'cloud-batch'
			});
			if (!updated) throw new Error('Transcript update needs one more try.');

			if (showingOriginal.has(transcript.id)) {
				const next = new Set(showingOriginal);
				next.delete(transcript.id);
				showingOriginal = next;
			}

			mirrorHistoryToVault();
			showToast(`${formatPromptStyle(promptStyleId)} version ready.`, 'success');
		} catch (error) {
			console.error('History re-transcribe failed:', error);
			showToast(error?.message || 'Re-transcribe needs one more try.', 'info');
		} finally {
			retranscribingId = null;
			retranscribeStyleId = null;
		}
	}

	// Start editing a transcript
	function startEdit(transcript) {
		openMenuId = null;
		restyleMenuId = null;
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

		openMenuId = null;
		restyleMenuId = null;
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
		const exported = await exportAllTranscriptsJSON(selectedTag);
		showToast(
			exported
				? selectedTag
					? `Exported #${selectedTag} as JSON.`
					: 'Exported as JSON.'
				: 'Nothing to export.',
			'success'
		);
	}

	// Export everything as one Markdown file
	async function handleExportMarkdown() {
		const exported = await exportAllTranscriptsMarkdown(selectedTag);
		showToast(
			exported
				? selectedTag
					? `Exported #${selectedTag} as Markdown.`
					: 'Exported as Markdown.'
				: 'Nothing to export yet.',
			'success'
		);
	}

	function handleSendToZipList(transcript = null) {
		const target = transcript || (selectedTag ? visibleTranscripts : $transcriptHistory);
		const listName = selectedTag ? `TalkType #${selectedTag}` : 'TalkType Tasks';
		const sent = sendTranscriptsToZipList(target, listName);
		if (sent) {
			soundService.play('select');
			showToast('Sent to ZipList!', 'success');
		} else {
			showToast('Nothing to send to ZipList.', 'warning');
		}
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
		if (copiedTimer) clearTimeout(copiedTimer);
		clearActiveAudio();
	});
</script>

<svelte:window on:click={closeFloatingMenus} on:keydown={handleWindowKeydown} />

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
				position="right-3 top-3"
				modalId="history_modal"
			/>
		</form>

		<!-- Header -->
		<div class="mb-3 shrink-0 border-b border-pink-100/80 pb-2.5">
			<div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pr-14">
				<!-- Title & Count -->
				<div class="flex items-center gap-2">
					<span class="text-base" aria-hidden="true">📝</span>
					<h3 id="history_modal_title" class="text-base font-black tracking-tight text-gray-800">
						History
					</h3>
					{#if $transcriptHistory.length > 0}
						<span
							class="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-bold tabular-nums text-pink-600"
						>
							{$transcriptHistory.length}
						</span>
					{/if}
					<p id="history_modal_description" class="sr-only">Your saved transcripts.</p>
				</div>

				{#if $transcriptHistory.length > 0}
					<!-- Action Bar Controls in one unified line -->
					<div class="flex items-center gap-1.5">
						<!-- Sort toggle button -->
						<button
							type="button"
							class="inline-flex h-7 items-center gap-1 rounded-full border border-pink-200/80 bg-white/90 px-2.5 text-xs font-bold text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-pink-600 active:scale-95"
							aria-pressed={oldestFirst}
							title={oldestFirst
								? 'Sorting: Oldest first (tap for newest)'
								: 'Sorting: Newest first (tap for oldest)'}
							on:click={() => (oldestFirst = !oldestFirst)}
						>
							<span class="text-xs font-black text-pink-500">{oldestFirst ? '↑' : '↓'}</span>
							<span>{oldestFirst ? 'Oldest' : 'Newest'}</span>
						</button>

						<!-- Export (Supporters) -->
						{#if isSupporter}
							<div class="relative inline-flex items-center">
								<button
									type="button"
									class="inline-flex h-7 items-center gap-1 rounded-l-full border border-pink-200/80 bg-white/90 px-2 text-xs font-bold text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-pink-600 active:scale-95"
									on:click={handleBatchDownload}
									title="Download all transcripts as a ZIP file"
									aria-label="Download all transcripts as ZIP"
								>
									<span>📥</span>
									<span>ZIP</span>
								</button>
								<button
									type="button"
									class="inline-flex h-7 items-center rounded-r-full border-y border-r border-pink-200/80 bg-white/90 px-1.5 text-xs font-bold text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-pink-600 active:scale-95"
									on:click={() => (showExportFormats = !showExportFormats)}
									aria-expanded={showExportFormats}
									title="More export options (Markdown, JSON)"
								>
									<span class="text-[10px] text-pink-500">▾</span>
								</button>

								{#if showExportFormats}
									<div
										class="absolute right-0 top-full z-20 mt-1 flex flex-col gap-1 rounded-xl border border-pink-100 bg-white p-1.5 shadow-lg ring-1 ring-black/5"
										transition:fade={{ duration: 120 }}
									>
										<button
											type="button"
											class="whitespace-nowrap rounded-lg px-2.5 py-1 text-left text-xs font-bold text-gray-700 transition hover:bg-pink-50 hover:text-pink-600"
											on:click={() => {
												showExportFormats = false;
												handleExportMarkdown();
											}}
										>
											📄 Markdown{selectedTag ? ` (#${selectedTag})` : ''}
										</button>
										<button
											type="button"
											class="whitespace-nowrap rounded-lg px-2.5 py-1 text-left text-xs font-bold text-gray-700 transition hover:bg-pink-50 hover:text-pink-600"
											on:click={() => {
												showExportFormats = false;
												handleExportJSON();
											}}
										>
											📦 JSON{selectedTag ? ` (#${selectedTag})` : ''}
										</button>
										<button
											type="button"
											class="whitespace-nowrap rounded-lg px-2.5 py-1 text-left text-xs font-bold text-amber-800 transition hover:bg-amber-50 hover:text-amber-900"
											on:click={() => {
												showExportFormats = false;
												handleSendToZipList();
											}}
										>
											⚡ Send to ZipList{selectedTag ? ` (#${selectedTag})` : ''}
										</button>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Clear button -->
						<button
							type="button"
							class={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-bold transition-all active:scale-95 ${
								confirmClearAll
									? 'border-amber-300 bg-amber-100 text-amber-900 shadow-sm'
									: 'border-pink-200/80 bg-white/90 text-gray-500 hover:bg-pink-50 hover:text-pink-600'
							}`}
							on:click={handleClearAll}
							aria-label={confirmClearAll ? 'Tap again to clear all history' : 'Clear all history'}
						>
							<span>{confirmClearAll ? '⚠️ Confirm?' : 'Clear'}</span>
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Tag Pills Row -->
		{#if isSupporter && availableTags.length > 0 && $transcriptHistory.length > 0}
			<div
				class="tt-scrollbar-x mb-3 flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1"
				role="group"
				aria-label="Filter history by tag"
			>
				<button
					type="button"
					class={`h-7 shrink-0 rounded-full px-3 text-xs font-black transition-all duration-150 active:scale-95 ${
						!selectedTag
							? 'border-2 border-gray-900 bg-gray-900 text-white shadow-[2px_2px_0px_#ff82ca]'
							: 'border-2 border-gray-300 bg-white/90 text-gray-700 hover:border-gray-900 hover:shadow-[2px_2px_0px_#1e1714]'
					}`}
					aria-pressed={!selectedTag}
					on:click={() => (selectedTag = '')}
				>
					All
				</button>
				{#each availableTags.slice(0, 14) as tag}
					<button
						type="button"
						class={`h-7 shrink-0 rounded-full px-3 text-xs font-bold transition-all duration-150 active:scale-95 ${getTagPillClass(
							tag,
							selectedTag === tag
						)}`}
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
						class="btn mt-6 min-h-12 border-2 border-gray-900 bg-pink-100 px-6 text-sm font-black text-gray-900 shadow-[3px_3px_0px_#ff82ca] transition-all hover:bg-pink-200 hover:shadow-[4px_4px_0px_#ff82ca] active:translate-y-0.5 active:shadow-none"
						on:click={() => (selectedTag = '')}
					>
						Show all
					</button>
				</div>
			{:else}
				<!-- Transcript List -->
				<div class="space-y-3.5">
					{#each visibleTranscripts as transcript (transcript.id)}
						<div
							class="group relative overflow-visible rounded-2xl border-2 border-l-[6px] border-gray-900/80 bg-white p-4 shadow-[3px_3px_0px_rgba(0,0,0,0.06)] transition-all duration-150 hover:shadow-[3px_3px_0px_rgba(0,0,0,0.14)] {getCardVibeTabClass(
								transcript
							)}"
						>
							<!-- Header: Two-Row Layout Top Bar -->
							<div class="mb-2.5">
								<!-- Meta line -->
								<div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
									<span class="text-xs font-black text-gray-800">
										{formatDate(transcript.timestamp)}
									</span>
									{#if transcript.duration > 0}
										<span
											class="text-xs font-bold tabular-nums text-gray-500"
											title="How long this recording ran"
										>
											{formatDuration(transcript.duration)}
										</span>
									{/if}
									{#if wordCountOf(transcript) > 0}
										<span
											class="text-xs font-bold tabular-nums text-gray-500"
											title="Words in this transcript"
										>
											{wordCountOf(transcript)}
											{wordCountOf(transcript) === 1 ? 'word' : 'words'}
										</span>
									{/if}
									{#if transcript.promptStyle && transcript.promptStyle !== 'standard'}
										{#if hasOriginal(transcript)}
											<button
												type="button"
												class="rounded-full border-2 border-gray-900 bg-pink-100 px-2 py-0.5 text-[10px] font-black text-pink-950 transition-all duration-150 hover:shadow-[2px_2px_0px_#ff82ca] active:scale-95"
												aria-pressed={showingOriginal.has(transcript.id)}
												title="Switch between the styled version and your plain words"
												on:click={() => toggleOriginal(transcript.id)}
											>
												{showingOriginal.has(transcript.id)
													? 'Plain'
													: formatPromptStyle(transcript.promptStyle)}
											</button>
										{:else}
											<span
												class="rounded-full border border-pink-300 bg-pink-100 px-2 py-0.5 text-[10px] font-black text-pink-900"
											>
												{formatPromptStyle(transcript.promptStyle)}
											</span>
										{/if}
									{/if}
								</div>

								<!-- Tags flow left, actions stay pinned right -->
								<div class="mt-1.5 flex items-center gap-2">
									<div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
										{#if transcript.tags?.length}
											{#each cleanTranscriptTags(transcript.tags).slice(0, 3) as tag}
												<button
													type="button"
													class={`rounded-full px-2 py-0.5 text-[10px] font-black transition-all duration-150 ${getTagPillClass(
														tag,
														selectedTag === tag
													)}`}
													aria-pressed={selectedTag === tag}
													on:click={() => toggleTag(tag)}
												>
													#{tag}
												</button>
											{/each}
										{/if}
									</div>

									<!-- Actions: Brutalist Tactile Switch Buttons -->
									<div class="history-action-cluster flex shrink-0 items-center gap-1.5">
										{#if editingId !== transcript.id}
											{#if transcript.audioBlob}
												<button
													type="button"
													class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-900 bg-amber-100 font-black text-amber-950 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#fbbf24] active:translate-y-0 active:shadow-none {activeAudioId ===
													transcript.id
														? 'bg-amber-300 shadow-[2px_2px_0px_#d97706]'
														: ''}"
													on:click|stopPropagation={() => toggleAudioPlayer(transcript)}
													title={activeAudioId === transcript.id
														? 'Hide audio player'
														: 'Play audio'}
													aria-expanded={activeAudioId === transcript.id}
													aria-label={activeAudioId === transcript.id
														? `Hide audio player for ${formatDate(transcript.timestamp)}`
														: `Play audio from ${formatDate(transcript.timestamp)}`}
												>
													<svg
														class="h-3.5 w-3.5"
														viewBox="0 0 24 24"
														fill="currentColor"
														aria-hidden="true"
													>
														{#if activeAudioId === transcript.id}
															<rect x="6" y="5" width="4" height="14" rx="1" />
															<rect x="14" y="5" width="4" height="14" rx="1" />
														{:else}
															<path d="M8 5v14l11-7z" />
														{/if}
													</svg>
												</button>
											{/if}

											<!-- Hero Copy Button: Tactile pink switch, turns emerald on copy -->
											<button
												type="button"
												class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-900 font-black transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none {copiedId ===
												transcript.id
													? 'bg-emerald-300 text-emerald-950 hover:shadow-[2px_2px_0px_#10b981]'
													: 'bg-pink-200 text-pink-950 hover:shadow-[2px_2px_0px_#ff82ca]'}"
												on:click|stopPropagation={() =>
													copyTranscript(displayedText(transcript), transcript.id)}
												aria-label={`Copy transcript from ${formatDate(transcript.timestamp)}`}
												title={copiedId === transcript.id ? 'Copied!' : 'Copy transcript'}
											>
												{#if copiedId === transcript.id}
													<span class="text-xs font-black leading-none" aria-hidden="true">✓</span>
												{:else}
													<svg
														class="h-3.5 w-3.5"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2.5"
														stroke-linecap="round"
														stroke-linejoin="round"
														aria-hidden="true"
													>
														<rect x="9" y="9" width="11" height="11" rx="2.5" />
														<path
															d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"
														/>
													</svg>
												{/if}
											</button>

											{#if transcript.audioBlob}
												<div class="history-popover-anchor relative">
													<button
														type="button"
														class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-900 bg-purple-100 font-black text-purple-950 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#c084fc] active:translate-y-0 active:shadow-none {restyleMenuId ===
															transcript.id || retranscribingId === transcript.id
															? 'bg-purple-300 shadow-[2px_2px_0px_#a855f7]'
															: ''} {retranscribingId && retranscribingId !== transcript.id
															? 'opacity-50'
															: ''}"
														on:click|stopPropagation={() => toggleRestyleMenu(transcript.id)}
														aria-haspopup="menu"
														aria-expanded={restyleMenuId === transcript.id}
														aria-label={`Re-transcribe transcript from ${formatDate(transcript.timestamp)}`}
														title={retranscribingId === transcript.id
															? 'Re-transcribing...'
															: 'Re-transcribe or restyle'}
													>
														{#if retranscribingId === transcript.id}
															<svg
																class="h-3.5 w-3.5 animate-spin text-purple-900"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2.25"
																stroke-linecap="round"
																aria-hidden="true"
															>
																<path d="M12 3a9 9 0 1 0 9 9" />
															</svg>
														{:else}
															<svg
																class="h-3.5 w-3.5"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2.5"
																stroke-linecap="round"
																stroke-linejoin="round"
																aria-hidden="true"
															>
																<path
																	d="M13 2l1.4 4.2L18.6 8l-4.2 1.8L13 14l-1.4-4.2L7.4 8l4.2-1.8L13 2Z"
																/>
																<path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />
																<path
																	d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"
																/>
															</svg>
														{/if}
													</button>

													{#if restyleMenuId === transcript.id}
														<div
															class="history-popover history-restyle-menu absolute right-0 top-[calc(100%+0.5rem)] z-40 w-52"
															role="menu"
															tabindex="-1"
															aria-label="Re-transcribe style"
															transition:fade={{ duration: 120 }}
															on:click|stopPropagation
															on:keydown|stopPropagation
														>
															<p class="px-3 pb-1 text-[11px] font-bold text-gray-400">
																Re-transcribe
															</p>
															{#each restyleOptions as option}
																<button
																	type="button"
																	role="menuitem"
																	class={`${restyleOptionClass} ${isRestyleOptionBlocked(option) ? 'opacity-60' : ''} ${(transcript.promptStyle || PROMPT_STYLES.STANDARD) === option.id ? 'bg-pink-50 text-pink-600' : ''}`}
																	aria-disabled={isRestyleOptionBlocked(option)}
																	disabled={retranscribingId === transcript.id}
																	title={restyleOptionHint(option)}
																	on:click={() => handleRestyleOption(transcript, option)}
																>
																	<span
																		class={`history-menu-icon ${option.tone}`}
																		aria-hidden="true"
																	>
																		{#if option.id === PROMPT_STYLES.STANDARD}
																			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																				<path d="M4 6h16M4 12h16M4 18h10" />
																			</svg>
																		{:else if option.id === PROMPT_STYLES.SURLY_PIRATE}
																			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																				<path d="M12 19l9 2-9-18-9 18 9-2Zm0 0v-8" />
																			</svg>
																		{:else if option.id === PROMPT_STYLES.QUILL_AND_INK}
																			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																				<path
																					d="M12 6v13M12 6C10.8 5.3 9.3 5 7.5 5S4.2 5.3 3 6v13c1.2-.7 2.7-1 4.5-1s3.3.3 4.5 1M12 6c1.2-.7 2.7-1 4.5-1s3.3.3 4.5 1v13c-1.2-.7-2.7-1-4.5-1s-3.3.3-4.5 1"
																				/>
																			</svg>
																		{:else}
																			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																				<path
																					d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
																				/>
																			</svg>
																		{/if}
																	</span>
																	<span>
																		{retranscribingId === transcript.id &&
																		retranscribeStyleId === option.id
																			? 'Working...'
																			: option.label}
																	</span>
																	{#if (transcript.promptStyle || PROMPT_STYLES.STANDARD) === option.id}
																		<span
																			class="ml-auto rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600"
																		>
																			Current
																		</span>
																	{/if}
																</button>
															{/each}
														</div>
													{/if}
												</div>
											{/if}
											<div class="history-popover-anchor relative">
												<button
													type="button"
													class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-900 bg-teal-100 font-black text-teal-950 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#2dd4bf] active:translate-y-0 active:shadow-none {openMenuId ===
													transcript.id
														? 'bg-teal-300 shadow-[2px_2px_0px_#0d9488]'
														: ''}"
													on:click|stopPropagation={() => toggleMenu(transcript.id)}
													aria-haspopup="menu"
													aria-expanded={openMenuId === transcript.id}
													aria-label={`More actions for transcript from ${formatDate(transcript.timestamp)}`}
													title="More actions"
												>
													<svg
														class="h-3.5 w-3.5"
														viewBox="0 0 24 24"
														fill="currentColor"
														aria-hidden="true"
													>
														<circle cx="5.5" cy="12" r="1.6" /><circle
															cx="12"
															cy="12"
															r="1.6"
														/><circle cx="18.5" cy="12" r="1.6" />
													</svg>
												</button>

												{#if openMenuId === transcript.id}
													<div
														class="history-popover history-actions-menu absolute right-0 top-[calc(100%+0.5rem)] z-30 w-48"
														role="menu"
														tabindex="-1"
														aria-label="Transcript actions"
														transition:fade={{ duration: 120 }}
														on:click|stopPropagation
														on:keydown|stopPropagation
													>
														<button
															type="button"
															role="menuitem"
															class={menuItemClass}
															on:click={() => startEdit(transcript)}
														>
															<span class="history-menu-icon text-pink-600" aria-hidden="true">
																<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																	<path d="M12 20h9" />
																	<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
																</svg>
															</span>
															Edit
														</button>
														{#if transcriptionService.isShareSupported()}
															<button
																type="button"
																role="menuitem"
																class={menuItemClass}
																on:click={() => {
																	closeFloatingMenus();
																	shareTranscriptItem(transcript);
																}}
															>
																<span class="history-menu-icon text-violet-500" aria-hidden="true">
																	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																		<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
																		<path d="M16 6l-4-4-4 4M12 2v14" />
																	</svg>
																</span>
																Share
															</button>
														{/if}
														<button
															type="button"
															role="menuitem"
															class={menuItemClass}
															on:click={() => {
																closeFloatingMenus();
																downloadTranscript(transcript);
															}}
														>
															<span class="history-menu-icon text-slate-500" aria-hidden="true">
																<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																	<path d="M12 3v12M7 10l5 5 5-5" />
																	<path d="M5 21h14" />
																</svg>
															</span>
															Download
														</button>
														<button
															type="button"
															role="menuitem"
															class={menuItemClass}
															on:click={() => {
																closeFloatingMenus();
																handleSendToZipList(transcript);
															}}
														>
															<span
																class="history-menu-icon font-bold text-amber-500"
																aria-hidden="true"
															>
																⚡
															</span>
															Send to ZipList
														</button>
														{#if transcript.audioBlob}
															<button
																type="button"
																role="menuitem"
																class={`${menuItemClass} transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50`}
																disabled={polishingId === transcript.id}
																on:click={() => downloadAudio(transcript)}
															>
																<span class="history-menu-icon text-amber-500" aria-hidden="true">
																	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																		<path d="M12 3v12M7 10l5 5 5-5" />
																		<path d="M5 19h14" />
																		<path d="M8 5h8" />
																	</svg>
																</span>
																{polishingId === transcript.id ? 'Saving...' : 'Save audio'}
															</button>
														{/if}
														<div class="my-1 border-t border-pink-100"></div>
														<button
															type="button"
															role="menuitem"
															class={`${destructiveMenuItemClass} ${pendingDeleteId === transcript.id ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 active:bg-rose-300' : ''}`}
															on:click={() =>
																pendingDeleteId === transcript.id
																	? confirmDelete(transcript.id)
																	: requestDelete(transcript.id)}
														>
															<span class="history-menu-icon text-rose-500" aria-hidden="true">
																<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
																	<path d="M3 6h18" />
																	<path d="M8 6V4h8v2" />
																	<path d="M19 6l-1 14H6L5 6" />
																	<path d="M10 11v5M14 11v5" />
																</svg>
															</span>
															{pendingDeleteId === transcript.id ? 'Tap again' : 'Remove'}
														</button>
													</div>
												{/if}
											</div>
										{/if}
									</div>
								</div>
							</div>

							<!-- Transcript Text -->
							{#if editingId === transcript.id}
								<!-- Edit Mode -->
								<div class="space-y-2">
									<textarea
										bind:this={editTextarea}
										bind:value={editText}
										class="history-edit-textarea tt-scrollbar w-full resize-y rounded-xl border border-pink-200 bg-[#fffdf7] px-3 py-3 text-base text-gray-800 shadow-inner transition-all duration-150 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
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
											class="btn min-h-12 border-pink-100 bg-[#fffdf7]/85 px-6 text-sm font-semibold text-gray-700 transition-all duration-150 hover:bg-pink-50 active:scale-95"
											on:click={cancelEdit}
										>
											Cancel
										</button>
										<button
											type="button"
											class="btn min-h-12 border-pink-200 bg-pink-500 px-6 text-sm font-bold text-[#fffdf5] transition-all duration-150 hover:border-pink-300 hover:bg-pink-600 active:scale-95 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:active:scale-100"
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
									<!-- showingOriginal referenced inline on purpose: a helper(transcript)
									     call here would hide it as a dependency and the flip would
									     render once, then lie. -->
									<p class="history-transcript-text text-sm text-gray-700">
										{normalizeTranscriptText(
											showingOriginal.has(transcript.id) ? transcript.originalText : transcript.text
										)}
									</p>
								</div>
							{/if}

							{#if activeAudioId === transcript.id && activeAudioUrl}
								<div
									class="mt-3 rounded-xl border-2 border-pink-200 bg-[#fffdf5] p-3 shadow-inner"
									transition:fade={{ duration: 150 }}
								>
									<CutePlayer
										src={activeAudioUrl}
										autoplay
										label={`Recording audio from ${formatDate(transcript.timestamp)}`}
									/>
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

	.history-popover {
		border: 2px solid rgba(249, 168, 212, 0.72);
		border-radius: 0.75rem;
		background: #fffdf7;
		padding: 0.45rem;
		box-shadow:
			0 14px 28px rgba(190, 24, 93, 0.12),
			0 2px 0 rgba(190, 24, 93, 0.12);
		transform-origin: top right;
		animation: history-pop-up 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.06) both;
	}

	@keyframes history-pop-up {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.history-menu-icon {
		display: inline-flex;
		width: 1.15rem;
		height: 1.15rem;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
	}

	.history-menu-icon svg {
		width: 100%;
		height: 100%;
		stroke-width: 2.25;
		stroke-linecap: round;
		stroke-linejoin: round;
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
