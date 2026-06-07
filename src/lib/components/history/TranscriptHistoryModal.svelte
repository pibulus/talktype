<script>
	import { onDestroy, onMount } from 'svelte';
	import {
		transcriptHistory,
		storageStats,
		loadAllTranscripts,
		updateTranscript,
		deleteTranscript,
		clearAllTranscripts,
		batchDownloadTranscripts,
		exportAllTranscriptsJSON,
		formatSize
	} from '$lib/services/storage/transcriptStorage';
	import { autoBackupHistoryToVault } from '$lib/services/storage/vaultAutoBackup.js';
	import { ModalCloseButton } from '$lib/components/modals/index.js';
	import {
		cleanTranscriptTags,
		getTranscriptTagPool
	} from '$lib/services/storage/transcriptTags.js';
	import { soundService } from '$lib/services/infrastructure/soundService.js';

	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { PRICING } from '$lib/config/pricing.js';

	export let closeModal = () => {};

	// Supporter status check
	$: isSupporter = $userPreferences.isSupporter;

	function openSupporterModal() {
		closeModal();
		setTimeout(() => {
			window.dispatchEvent(new CustomEvent('talktype:open-supporter-modal'));
		}, 75);
	}

	let confirmClearAll = false;
	let pendingDeleteId = null;
	let editingId = null;
	let editText = '';
	let clearAllTimeout = null;
	let deleteConfirmTimeout = null;
	let activeAudioId = null;
	let activeAudioUrl = '';
	let selectedTag = '';
	const iconButtonClass = 'btn btn-ghost h-12 min-h-12 w-12 px-0 text-base';

	$: availableTags = getTranscriptTagPool($transcriptHistory);
	$: visibleTranscripts = selectedTag
		? $transcriptHistory.filter((transcript) =>
				cleanTranscriptTags(transcript.tags || []).includes(selectedTag)
			)
		: $transcriptHistory;
	$: if (selectedTag && !availableTags.includes(selectedTag)) {
		selectedTag = '';
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

	function formatMethod(method) {
		const labels = {
			'deepgram-live': 'Live',
			gemini: 'Gemini',
			whisper: 'Offline',
			'offline-whisper': 'Offline',
			'cloud-batch': 'Cloud'
		};

		return labels[method] || method;
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
		try {
			await navigator.clipboard.writeText(text);
			soundService.copySuccess();
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: { message: 'Copied', type: 'success' }
				})
			);
		} catch (err) {
			console.error('Failed to copy:', err);
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: { message: 'Try again', type: 'info' }
				})
			);
		}
	}

	// Download single transcript as text file
	function downloadTranscript(transcript) {
		const blob = new Blob([transcript.text], { type: 'text/plain' });
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
		editingId = transcript.id;
		editText = transcript.text;
	}

	// Save edited transcript
	async function saveEdit(id) {
		if (editText.trim()) {
			await updateTranscript(id, editText.trim());
			editingId = null;
			editText = '';
			mirrorHistoryToVault();

			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: { message: 'Transcript updated.', type: 'success' }
				})
			);
		}
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

		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message: 'Transcript removed from history.', type: 'info' }
			})
		);
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

		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message: 'History cleared.', type: 'info' }
			})
		);
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

	// Batch download all transcripts
	async function handleBatchDownload() {
		const count = await batchDownloadTranscripts();
		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: {
					message: `Downloading ${count} transcript${count !== 1 ? 's' : ''}.`,
					type: 'success'
				}
			})
		);
	}

	// Export as JSON
	async function handleExportJSON() {
		await exportAllTranscriptsJSON();
		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message: 'Exported as JSON.', type: 'success' }
			})
		);
	}

	onMount(() => {
		loadAllTranscripts();
	});

	onDestroy(() => {
		if (clearAllTimeout) clearTimeout(clearAllTimeout);
		if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
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
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-2">
					<span class="text-2xl" aria-hidden="true">📚</span>
					<div>
						<h3 id="history_modal_title" class="text-xl font-black tracking-tight text-gray-800">
							Transcript History
						</h3>
						<p id="history_modal_description" class="sr-only">
							Review, copy, edit, download, export, or clear saved transcripts.
						</p>
						<p class="text-xs text-gray-500">
							{$storageStats.count} transcript{$storageStats.count !== 1 ? 's' : ''} •
							{formatSize($storageStats.totalSize)}
							{#if selectedTag}
								• #{selectedTag}
							{/if}
						</p>
					</div>
				</div>

				{#if $transcriptHistory.length > 0}
					<div class="flex flex-wrap gap-2 sm:justify-end">
						<button
							type="button"
							class="btn min-h-11 flex-1 border-pink-100 bg-white/75 px-2 text-sm text-gray-700 hover:bg-pink-50 sm:flex-none sm:px-3"
							on:click={handleBatchDownload}
							title="Download all as text files"
							aria-label="Download all transcripts as text files"
						>
							Download
						</button>
						<button
							type="button"
							class="btn min-h-11 flex-1 border-pink-100 bg-white/75 px-2 text-sm text-gray-700 hover:bg-pink-50 sm:flex-none sm:px-3"
							on:click={handleExportJSON}
							title="Export as JSON"
							aria-label="Export transcript history as JSON"
						>
							JSON
						</button>
						<button
							type="button"
							class="btn min-h-11 flex-1 border-pink-100 bg-white/75 px-2 text-sm text-gray-700 hover:bg-pink-50 sm:flex-none sm:px-3"
							on:click={handleClearAll}
							aria-label={confirmClearAll
								? 'Tap again to clear transcript history'
								: 'Clear transcript history'}
						>
							{confirmClearAll ? 'Tap again' : 'Clear'}
						</button>
					</div>
				{/if}
			</div>
		</div>

		{#if isSupporter && availableTags.length > 0 && $transcriptHistory.length > 0}
			<div
				class="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1"
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
			{#if !isSupporter}
				<div class="space-y-4 py-12 text-center">
					<p class="text-4xl" aria-hidden="true">🔒</p>
					<h4 class="text-lg font-black text-gray-800">Transcript History Locked</h4>
					<p class="mx-auto max-w-sm text-sm text-gray-600">
						Unlock transcript history, downloads, and style presets with a one-time supporter
						contribution.
					</p>
					<button
						type="button"
						class="btn min-h-12 border-pink-200 bg-pink-500 px-6 text-white hover:bg-pink-600"
						on:click={openSupporterModal}
					>
						Unlock for {PRICING.displayPrice}
					</button>
				</div>
			{:else if $transcriptHistory.length === 0}
				<!-- Empty State -->
				<div class="py-12 text-center">
					<p class="mb-2 text-4xl opacity-30" aria-hidden="true">📝</p>
					<p class="text-sm text-gray-500">No transcripts yet</p>
					<p class="text-xs text-gray-400">Your saved transcripts will appear here</p>
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
										{#if transcript.method}
											<span
												class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700"
											>
												{formatMethod(transcript.method)}
											</span>
										{/if}
										{#if transcript.promptStyle && transcript.promptStyle !== 'standard'}
											<span
												class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700"
											>
												{formatPromptStyle(transcript.promptStyle)}
											</span>
										{/if}
									</div>
									<p class="text-xs text-gray-400">
										{transcript.wordCount} words • {transcript.duration}s
									</p>
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

								<!-- Actions -->
								<div
									class="flex w-full shrink-0 justify-between gap-1 opacity-100 transition-opacity sm:w-auto sm:flex-wrap sm:justify-end sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
								>
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
											class={iconButtonClass}
											on:click={() => startEdit(transcript)}
											title="Edit"
											aria-label={`Edit transcript from ${formatDate(transcript.timestamp)}`}
										>
											<span aria-hidden="true">✏️</span>
										</button>
										<button
											type="button"
											class={iconButtonClass}
											on:click={() => copyTranscript(transcript.text)}
											title="Copy text"
											aria-label={`Copy transcript from ${formatDate(transcript.timestamp)}`}
										>
											<span aria-hidden="true">📋</span>
										</button>
										<button
											type="button"
											class={iconButtonClass}
											on:click={() => downloadTranscript(transcript)}
											title="Download"
											aria-label={`Download transcript from ${formatDate(transcript.timestamp)}`}
										>
											<span aria-hidden="true">💾</span>
										</button>
										<button
											type="button"
											class={`${iconButtonClass} text-amber-700 hover:bg-amber-50`}
											on:click={() =>
												pendingDeleteId === transcript.id
													? confirmDelete(transcript.id)
													: requestDelete(transcript.id)}
											title="Remove"
											aria-label={pendingDeleteId === transcript.id
												? `Tap again to remove transcript from ${formatDate(transcript.timestamp)}`
												: `Remove transcript from ${formatDate(transcript.timestamp)}`}
										>
											<span aria-hidden="true">
												{pendingDeleteId === transcript.id ? '✓' : '×'}
											</span>
										</button>
									{/if}
								</div>
							</div>

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
										bind:value={editText}
										class="w-full rounded border border-pink-200 bg-white p-2 text-base focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 sm:text-sm"
										rows="4"
										aria-label="Edit transcript text"
									></textarea>
									<div class="flex justify-end gap-2">
										<button
											type="button"
											class="btn btn-ghost min-h-11 px-4 text-sm"
											on:click={cancelEdit}
										>
											Cancel
										</button>
										<button
											type="button"
											class="btn btn-primary min-h-11 px-4 text-sm"
											on:click={() => saveEdit(transcript.id)}
										>
											Save
										</button>
									</div>
								</div>
							{:else}
								<!-- View Mode -->
								<div class="tt-modal-scroll-area max-h-24 overflow-y-auto rounded bg-gray-50 p-2">
									<p class="text-sm text-gray-700">{transcript.text}</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
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
</style>
