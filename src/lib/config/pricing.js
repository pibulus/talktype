/**
 * Pricing Configuration for TalkType Premium
 * Centralized pricing to make updates easy
 */

export const PRICING = {
	// Base pricing
	basePrice: 19.00,
	currency: 'AUD',

	// Launch special pricing
	launchSpecial: {
		enabled: true,
		price: 9.00,
		limit: 100, // First 100 customers
		message: '🎉 Launch Special',
		savings: 10.00 // How much they save
	},

	// Display helpers
	get currentPrice() {
		return this.launchSpecial.enabled ? this.launchSpecial.price : this.basePrice;
	},

	get displayPrice() {
		return `$${this.currentPrice.toFixed(0)} ${this.currency}`;
	},

	get hasDiscount() {
		return this.launchSpecial.enabled && this.launchSpecial.price < this.basePrice;
	}
};

/**
 * Marketing messages for pricing
 */
export const PRICING_MESSAGES = {
	valueProposition: 'Pay once, own forever',
	comparison: 'vs $10+/month subscriptions',
	guarantee: '30-day money-back guarantee',
	launchSpecial: `First ${PRICING.launchSpecial.limit} customers save $${PRICING.launchSpecial.savings}!`
};
