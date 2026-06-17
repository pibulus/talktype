/**
 * TalkType Supporter pricing.
 *
 * Keep this boring on purpose: one flat once-off price, no fake anchor, no
 * "launch special" that silently jumps later. $9 AUD, always. One tap, lasts a
 * year — not a subscription.
 */
export const PRICING = {
	currentPrice: 9,
	currency: 'AUD', // Square charge currency; the displayed price is just "$9" (≈ same in USD)
	productName: 'TalkType Supporter Pass',
	termDays: 365,

	get displayPrice() {
		return `$${this.currentPrice.toFixed(0)}`;
	}
};

/**
 * Marketing messages for pricing.
 */
export const PRICING_MESSAGES = {
	valueProposition: '$9 a year, no subscription',
	comparison: 'one tap, lasts a year',
	guarantee: 'Supporter codes work for gifts and your other devices.'
};
