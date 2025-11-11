<script>
	import { onMount } from 'svelte';
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
	import { isPremium } from '$lib/services/premium/premiumService';
	import { ModalCloseButton } from '$lib/components/modals/index.js';
	import { Button } from '$lib/components/shared';

	export let closeModal = () => {};

	let confirmClearAll = false;
	let editingId = null;
	let editText = '';

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

	// Copy transcript to clipboard
	async function copyTranscript(text) {
		try {
			await navigator.clipboard.writeText(text);
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: { message: '📋 Copied to clipboard!', type: 'success' }
				})
			);
		} catch (err) {
			console.error('Failed to copy:', err);
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

			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: { message: '✏️ Transcript updated!', type: 'success' }
				})
			);
		}
	}

	// Cancel editing
	function cancelEdit() {
		editingId = null;
		editText = '';
	}

	// Delete a transcript
	async function handleDelete(id) {
		if (confirm('Delete this transcript? This cannot be undone.')) {
			await deleteTranscript(id);
		}
	}

	// Clear all transcripts
	async function handleClearAll() {
		if (!confirmClearAll) {
			confirmClearAll = true;
			setTimeout(() => (confirmClearAll = false), 3000);
			return;
		}

		await clearAllTranscripts();
		confirmClearAll = false;

		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message: '🗑️ All transcripts cleared', type: 'info' }
			})
		);
	}

	// Play audio (if available)
	function playAudio(audioBlob) {
		const audio = new Audio(URL.createObjectURL(audioBlob));
		audio.play();
	}

	// Batch download all transcripts
	async function handleBatchDownload() {
		const count = await batchDownloadTranscripts();
		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message: `📦 Downloading ${count} transcript${count !== 1 ? 's' : ''}...`, type: 'success' }
			})
		);
	}

	// Export as JSON
	async function handleExportJSON() {
		await exportAllTranscriptsJSON();
		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message: '📄 Exported as JSON!', type: 'success' }
			})
		);
	}

	onMount(() => {
		loadAllTranscripts();
	});
</script>

<dialog
	id="history_modal"
	class="modal fixed z-[999] overflow-hidden"
	aria-labelledby="history_modal_title"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[85vh] w-[95%] max-w-3xl overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl"
	>
		<form method="dialog">
			<ModalCloseButton
				closeModal={() => closeModal()}
				label="Close history"
				position="right-2 top-2"
				modalId="history_modal"
			/>
		</form>

		<!-- Header -->
		<div class="mb-4 border-b border-pink-100 pb-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="text-2xl">📚</span>
					<div>
						<h3 id="history_modal_title" class="text-xl font-black tracking-tight text-gray-800">
							Transcript History
						</h3>
						<p class="text-xs text-gray-500">
							{$storageStats.count} transcript{$storageStats.count !== 1 ? 's' : ''} •
							{formatSize($storageStats.totalSize)}
						</p>
					</div>
				</div>

				{#if $transcriptHistory.length > 0}
					<div class="flex gap-2">
						<Button variant="ghost" size="sm" on:click={handleBatchDownload} title="Download all as text files">
							📦 Download All
						</Button>
						<Button variant="ghost" size="sm" on:click={handleExportJSON} title="Export as JSON">
							📄 JSON
						</Button>
						<Button variant="ghost" size="sm" on:click={handleClearAll}>
							{confirmClearAll ? '⚠️ Confirm?' : '🗑️ Clear All'}
						</Button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Content -->
		<div class="max-h-[calc(85vh-140px)] overflow-y-auto">
			{#if !$isPremium}
				<!-- Premium Upsell -->
				<div class="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-center">
					<p class="mb-2 text-2xl">⭐</p>
					<h4 class="mb-2 font-bold text-gray-800">Upgrade to Premium</h4>
					<p class="mb-3 text-sm text-gray-600">
						Save all your transcripts and audio for later. Access your full history anytime!
					</p>
					<Button
						variant="primary"
						on:click={() => {
							closeModal();
							document.getElementById('premium_modal').showModal();
						}}
					>
						Unlock for $9
					</Button>
				</div>
			{:else if $transcriptHistory.length === 0}
				<!-- Empty State -->
				<div class="py-12 text-center">
					<p class="mb-2 text-4xl opacity-30">📝</p>
					<p class="text-sm text-gray-500">No transcripts yet</p>
					<p class="text-xs text-gray-400">Your saved transcripts will appear here</p>
				</div>
			{:else}
				<!-- Transcript List -->
				<div class="space-y-3">
					{#each $transcriptHistory as transcript (transcript.id)}
						<div
							class="group rounded-lg border border-pink-100 bg-white/50 p-3 shadow-sm transition-all hover:shadow-md"
						>
							<!-- Header -->
							<div class="mb-2 flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="text-xs font-medium text-gray-500">
											{formatDate(transcript.timestamp)}
										</span>
										{#if transcript.method}
											<span
												class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700"
											>
												{transcript.method}
											</span>
										{/if}
										{#if transcript.promptStyle && transcript.promptStyle !== 'standard'}
											<span
												class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700"
											>
												{transcript.promptStyle}
											</span>
										{/if}
									</div>
									<p class="text-xs text-gray-400">
										{transcript.wordCount} words • {transcript.duration}s
									</p>
								</div>

								<!-- Actions -->
								<div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
									{#if editingId !== transcript.id}
										{#if transcript.audioBlob}
											<button
												class="btn btn-ghost btn-xs"
												on:click={() => playAudio(transcript.audioBlob)}
												title="Play audio"
											>
												🔊
											</button>
										{/if}
										<button
											class="btn btn-ghost btn-xs"
											on:click={() => startEdit(transcript)}
											title="Edit"
										>
											✏️
										</button>
										<button
											class="btn btn-ghost btn-xs"
											on:click={() => copyTranscript(transcript.text)}
											title="Copy text"
										>
											📋
										</button>
										<button
											class="btn btn-ghost btn-xs"
											on:click={() => downloadTranscript(transcript)}
											title="Download"
										>
											💾
										</button>
										<button
											class="btn btn-ghost btn-xs text-error"
											on:click={() => handleDelete(transcript.id)}
											title="Delete"
										>
											🗑️
										</button>
									{/if}
								</div>
							</div>

							<!-- Transcript Text -->
							{#if editingId === transcript.id}
								<!-- Edit Mode -->
								<div class="space-y-2">
									<textarea
										bind:value={editText}
										class="w-full rounded border border-pink-200 bg-white p-2 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
										rows="4"
									></textarea>
									<div class="flex justify-end gap-2">
										<button
											class="btn btn-ghost btn-xs"
											on:click={cancelEdit}
										>
											Cancel
										</button>
										<button
											class="btn btn-primary btn-xs"
											on:click={() => saveEdit(transcript.id)}
										>
											Save
										</button>
									</div>
								</div>
							{:else}
								<!-- View Mode -->
								<div class="max-h-24 overflow-y-auto rounded bg-gray-50 p-2">
									<p class="text-sm text-gray-700">{transcript.text}</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</dialog>

<style>
	.animate-modal-enter {
		animation: modalSlideUp 0.3s ease-out;
	}

	@keyframes modalSlideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	/* Scrollbar styling */
	.overflow-y-auto::-webkit-scrollbar {
		width: 8px;
	}

	.overflow-y-auto::-webkit-scrollbar-track {
		background: #f9f5f0;
		border-radius: 4px;
	}

	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: #ffc9e6;
		border-radius: 4px;
	}

	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background: #ffb6de;
	}
</style>
