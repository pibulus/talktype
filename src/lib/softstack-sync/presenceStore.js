import { writable } from "svelte/store";

export function createPresenceStore() {
  const { subscribe, set } = writable([]);

  return {
    subscribe,
    setUsers(users) {
      set(users);
    },
    clear() {
      set([]);
    },
  };
}

const presenceStores = new Map();

export function getPresenceStore(roomId) {
  if (!presenceStores.has(roomId)) {
    presenceStores.set(roomId, createPresenceStore());
  }
  return presenceStores.get(roomId);
}

export function cleanupPresenceStore(roomId) {
  const store = presenceStores.get(roomId);
  if (store) {
    store.clear();
    presenceStores.delete(roomId);
  }
}
