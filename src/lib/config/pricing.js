/**
 * Pricing Configuration for TalkType Premium
 * Centralized pricing to make updates easy
 */

export const PRICING = {
	// Base pricing
	// NOTE: Currently set to AUD. To support both USD and AUD:
	// 1. Detect user location (IP geolocation API)
	// 2. Create separate USD/AUD configs
	// 3. Update Square payment to use correct currency
	// For now: Keeping it simple with single currency
	basePrice: 19.0,
	currency: 'AUD', // Australian Dollars ($9 AUD ≈ $6 USD)

	// Launch special pricing
	launchSpecial: {
		enabled: true,
		price: 9.0,
		limit: 100, // First 100 customers (tracked in real-time!)
		message: '🎉 Launch Special',
		savings: 10.0 // How much they save
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
