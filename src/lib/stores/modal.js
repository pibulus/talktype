import { writable } from 'svelte/store';

export const modal = writable(null);

export function showModal(name, props = {}) {
  modal.set({ name, props });
}

export function hideModal() {
  modal.set(null);
}
