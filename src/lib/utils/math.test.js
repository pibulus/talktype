import { describe, it, expect } from 'vitest';

// Simple utility function for testing
export function add(a, b) {
	return a + b;
}

export function multiply(a, b) {
	return a * b;
}

describe('Math Utilities', () => {
	describe('add function', () => {
		it('adds two positive numbers', () => {
			expect(add(2, 3)).toBe(5);
		});

		it('adds negative numbers', () => {
			expect(add(-2, -3)).toBe(-5);
		});

		it('adds zero', () => {
			expect(add(5, 0)).toBe(5);
		});
	});

	describe('multiply function', () => {
		it('multiplies two positive numbers', () => {
			expect(multiply(3, 4)).toBe(12);
		});

		it('multiplies by zero', () => {
			expect(multiply(5, 0)).toBe(0);
		});

		it('multiplies negative numbers', () => {
			expect(multiply(-2, 3)).toBe(-6);
		});
	});
});