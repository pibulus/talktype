import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import Ghost from './Ghost.svelte';

// Mock the SvelteKit environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock the infrastructure services
vi.mock('$lib/services/infrastructure', () => ({
	appActive: { subscribe: vi.fn((fn) => fn(true)) },
	shouldAnimateStore: { subscribe: vi.fn((fn) => fn(true)) }
}));

describe('Ghost Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Core Functionality', () => {
		it('renders the ghost button', () => {
			const { container } = render(Ghost);
			const ghostButton = container.querySelector('button');
			expect(ghostButton).toBeInTheDocument();
		});

		it('renders the SVG element', () => {
			const { container } = render(Ghost);
			const svgElement = container.querySelector('svg');
			expect(svgElement).toBeInTheDocument();
			expect(svgElement).toHaveAttribute('viewBox', '0 0 1024 1024');
		});

		it('applies custom dimensions', () => {
			const { container } = render(Ghost, {
				props: {
					width: '200px',
					height: '200px'
				}
			});
			const ghostButton = container.querySelector('button');
			expect(ghostButton.style.width).toBe('200px');
			expect(ghostButton.style.height).toBe('200px');
		});

		it('applies opacity and scale', () => {
			const { container } = render(Ghost, {
				props: {
					opacity: 0.5,
					scale: 1.5
				}
			});
			const ghostButton = container.querySelector('button');
			expect(ghostButton.style.opacity).toBe('0.5');
			expect(ghostButton.style.transform).toContain('scale(1.5)');
		});
	});

	describe('Click Behavior', () => {
		it('dispatches custom event when clicked', async () => {
			const mockHandler = vi.fn();
			window.addEventListener('talktype:toggle-recording', mockHandler);

			const { container } = render(Ghost, {
				props: {
					clickable: true
				}
			});

			const ghostButton = container.querySelector('button');
			await fireEvent.click(ghostButton);

			expect(mockHandler).toHaveBeenCalledTimes(1);

			window.removeEventListener('talktype:toggle-recording', mockHandler);
		});

		it('does not dispatch event when not clickable', async () => {
			const mockHandler = vi.fn();
			window.addEventListener('talktype:toggle-recording', mockHandler);

			const { container } = render(Ghost, {
				props: {
					clickable: false
				}
			});

			const ghostButton = container.querySelector('button');
			await fireEvent.click(ghostButton);

			expect(mockHandler).not.toHaveBeenCalled();

			window.removeEventListener('talktype:toggle-recording', mockHandler);
		});

		it('applies non-clickable class when clickable is false', () => {
			const { container } = render(Ghost, {
				props: {
					clickable: false
				}
			});
			const ghostButton = container.querySelector('button');
			expect(ghostButton).toHaveClass('ghost-non-clickable');
		});
	});

	describe('State Classes', () => {
		it('does not have recording class initially', () => {
			const { container } = render(Ghost, {
				props: {
					isRecording: false
				}
			});
			const ghostButton = container.querySelector('button');
			expect(ghostButton).not.toHaveClass('recording');
		});

		it('applies recording class when isRecording is true', () => {
			const { container } = render(Ghost, {
				props: {
					isRecording: true
				}
			});
			const ghostButton = container.querySelector('button');
			// The class is dynamically applied through the store
			// We check for the SVG element which also gets the class
			const svgElement = container.querySelector('svg');
			expect(svgElement).toHaveClass('recording');
		});
	});

	describe('Theme Support', () => {
		it('applies theme class to container', () => {
			const { container } = render(Ghost, {
				props: {
					externalTheme: 'peach'
				}
			});
			const ghostButton = container.querySelector('button');
			expect(ghostButton).toHaveClass('theme-peach');
		});

		it('applies theme class to SVG', () => {
			const { container } = render(Ghost, {
				props: {
					externalTheme: 'mint'
				}
			});
			const svgElement = container.querySelector('svg');
			expect(svgElement).toHaveClass('theme-mint');
		});
	});

	describe('Accessibility', () => {
		it('has proper ARIA attributes', () => {
			const { container } = render(Ghost, {
				props: {
					clickable: true,
					isRecording: false
				}
			});
			const ghostButton = container.querySelector('button');

			expect(ghostButton).toHaveAttribute('aria-label', 'Toggle Recording');
			expect(ghostButton).toHaveAttribute('aria-pressed', 'false');
			expect(ghostButton).toHaveAttribute('tabindex', '0');
		});

		it('updates aria-pressed when recording', () => {
			const { container } = render(Ghost, {
				props: {
					clickable: true,
					isRecording: true
				}
			});
			const ghostButton = container.querySelector('button');
			expect(ghostButton).toHaveAttribute('aria-pressed', 'true');
		});

		it('is not keyboard accessible when not clickable', () => {
			const { container } = render(Ghost, {
				props: {
					clickable: false
				}
			});
			const ghostButton = container.querySelector('button');
			expect(ghostButton).toHaveAttribute('tabindex', '-1');
		});

		it('responds to Enter key', async () => {
			const mockHandler = vi.fn();
			window.addEventListener('talktype:toggle-recording', mockHandler);

			const { container } = render(Ghost, {
				props: {
					clickable: true
				}
			});

			const ghostButton = container.querySelector('button');
			await fireEvent.keyDown(ghostButton, { key: 'Enter' });

			expect(mockHandler).toHaveBeenCalled();

			window.removeEventListener('talktype:toggle-recording', mockHandler);
		});

		it('responds to Space key', async () => {
			const mockHandler = vi.fn();
			window.addEventListener('talktype:toggle-recording', mockHandler);

			const { container } = render(Ghost, {
				props: {
					clickable: true
				}
			});

			const ghostButton = container.querySelector('button');
			await fireEvent.keyDown(ghostButton, { key: ' ' });

			expect(mockHandler).toHaveBeenCalled();

			window.removeEventListener('talktype:toggle-recording', mockHandler);
		});
	});
});
