/**
 * TalkType Supporter pricing.
 *
 * Keep this boring on purpose: one flat once-off price, no fake anchor, no
 * "launch special" that silently jumps later. One tap, lasts a year — not a
 * subscription.
 *
 * THE ONE DIAL: change currentPrice and every price string in the app follows.
 * User-facing copy must derive from displayPrice — never hardcode a number.
 */
export const PRICING = {
	currentPrice: 24,
	currency: 'AUD', // Square charge currency; the displayed price is just the number (≈ same in USD)
	productName: 'TalkType Supporter Pass',
	termDays: 365,

	get displayPrice() {
		return `$${this.currentPrice.toFixed(0)}`;
	}
};
