import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
	generateSyncPhrase,
	deriveRoomIdFromPhrase,
	connectToLiveRoom,
	sendUpdate
} from '$lib/softstack-sync/index.js';
import { transcriptionStore } from './transcriptionStore.js';

const STORAGE_KEY = 'talktype_sync_phrase';
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'pibulus-party.pibulus.partykit.dev';

function createSyncStore() {
	const initialPhrase = browser
		? window.localStorage.getItem(STORAGE_KEY) || generateSyncPhrase()
		: generateSyncPhrase();

	const { subscribe, set, update } = writable({
		phrase: initialPhrase,
		roomId: '',
		status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
		remoteState: null
	});

	let socket = null;
	let unsubscribeTranscription = null;

	async function connect(phrase) {
		if (!browser) return;

		update((s) => ({ ...s, status: 'connecting', phrase }));
		window.localStorage.setItem(STORAGE_KEY, phrase);

		const roomId = await deriveRoomIdFromPhrase(phrase, 'tt_');
		update((s) => ({ ...s, roomId }));

		if (socket) {
			socket.close();
		}

		socket = connectToLiveRoom(
			PARTYKIT_HOST,
			roomId,
			{},
			{
				onConnect: () => {
					update((s) => ({ ...s, status: 'connected' }));
					// Push current local state immediately on connect if we have one
					const currentTrans = get(transcriptionStore);
					if (currentTrans.transcript || currentTrans.interim) {
						sendUpdate(socket, 'state_update', currentTrans);
					}
				},
				onDisconnect: () => {
					update((s) => ({ ...s, status: 'disconnected' }));
				},
				onUpdate: (message) => {
					if (message.type === 'state_update' && message.data) {
						// We received state from another device!
						update((s) => ({ ...s, remoteState: message.data }));
					}
				},
				onError: () => {
					update((s) => ({ ...s, status: 'error' }));
				}
			}
		);

		// Wire up the local transcription store to broadcast automatically
		if (unsubscribeTranscription) unsubscribeTranscription();

		unsubscribeTranscription = transcriptionStore.subscribe((state) => {
			// Only broadcast if we have actual text changes
			if (socket && socket.readyState === 1) {
				// 1 is OPEN
				if (state.transcript || state.interim) {
					sendUpdate(socket, 'state_update', state);
				}
			}
		});
	}

	return {
		subscribe,
		setPhrase: (newPhrase) => connect(newPhrase),
		init: () => {
			if (browser) {
				connect(initialPhrase);
			}
		}
	};
}

export const syncStore = createSyncStore();
