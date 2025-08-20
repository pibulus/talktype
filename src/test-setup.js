import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock browser APIs that might not exist in test environment
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock Audio API
global.Audio = vi.fn().mockImplementation(() => ({
	play: vi.fn(),
	pause: vi.fn(),
	addEventListener: vi.fn()
}));

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
	start: vi.fn(),
	stop: vi.fn(),
	addEventListener: vi.fn(),
	state: 'inactive'
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
	writable: true,
	value: {
		getUserMedia: vi.fn().mockResolvedValue({
			getTracks: () => [],
			getAudioTracks: () => [],
			getVideoTracks: () => []
		})
	}
});