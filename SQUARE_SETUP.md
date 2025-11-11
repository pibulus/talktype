# Square Payment Setup Guide

This guide explains how to set up Square payments for TalkType premium unlocks.

## Overview

TalkType uses Square Web Payments SDK for secure payment processing. When a user pays $9 AUD:
1. Square processes the payment securely
2. Backend generates a unique unlock code (e.g., `TALK-AB34-XY89`)
3. User receives the code to unlock premium on all devices
4. Premium features activate instantly via localStorage

## Getting Your Square Credentials

### 1. Create a Square Developer Account

Visit [Square Developer Dashboard](https://developer.squareup.com/apps)

### 2. Create a New Application

1. Click "Create App"
2. Name it "TalkType" or similar
3. Select your Square account

### 3. Get Your Credentials

You'll need **three** values:

#### Production Credentials (for live payments):
- **Application ID**: Found in "Credentials" tab (starts with `sq0idp-`)
- **Access Token**: Found in "Production" section (starts with `EAAAE...`)
- **Location ID**: Found in "Locations" tab

#### Sandbox Credentials (for testing):
- **Sandbox Application ID**: Found in "Credentials" tab under "Sandbox"
- **Sandbox Access Token**: Found in "Sandbox" section
- **Sandbox Location ID**: Found in "Locations" tab under "Sandbox"

## Configuration

### 1. Add Environment Variables

Copy `.env.example` to `.env` and fill in your Square credentials:

```bash
# Production Square credentials
SQUARE_ACCESS_TOKEN=your_production_access_token_here
SQUARE_LOCATION_ID=your_production_location_id_here

# Sandbox/Development Square credentials (for testing)
SQUARE_SANDBOX_ACCESS_TOKEN=your_sandbox_access_token_here
SQUARE_SANDBOX_LOCATION_ID=your_sandbox_location_id_here

# Square Application ID (public, used in frontend)
VITE_SQUARE_APP_ID=your_square_application_id_here
```

### 2. Testing in Development

The app automatically uses **Sandbox credentials** in development mode (`npm run dev`).

**Test without Square setup:**
- If Square credentials aren't configured, the app falls back to demo mode
- Click "Pay $9 AUD" to generate a test unlock code
- Use code `TALK-TEST-CODE` to test validation

**Test with Square Sandbox:**
1. Add Sandbox credentials to `.env`
2. Use Square's [test card numbers](https://developer.squareup.com/docs/devtools/sandbox/payments):
   - Card: `4111 1111 1111 1111`
   - Expiry: Any future date
   - CVV: `111`
   - ZIP: `12345`

### 3. Going Live

1. Get your **Production** credentials from Square
2. Update `.env` with production values
3. Build and deploy: `npm run build`
4. Test with a real $9 payment

## How It Works

### Payment Flow

```
User clicks "Unlock Premium"
  ↓
Square Web Payments SDK loads
  ↓
User enters card details
  ↓
Square tokenizes card (secure)
  ↓
Frontend sends token to /api/purchase-premium
  ↓
Backend calls Square Payments API
  ↓
Payment successful → Generate unlock code
  ↓
Return code to user
  ↓
Premium features unlock immediately
```

### Multi-Device Flow

```
Device A: User pays $9 → Receives code TALK-AB34-XY89
  ↓
Device B: User opens TalkType
  ↓
Settings → "Already Premium? Enter Code"
  ↓
Enter TALK-AB34-XY89
  ↓
Frontend calls /api/validate-code
  ↓
Backend validates → Premium unlocks on Device B
```

## Storage

Unlock codes are stored in `src/lib/server/data/unlock-codes.json`:

```json
{
  "codes": {
    "TALK-AB34-XY89": {
      "paymentId": "sq0payment-123...",
      "amount": 9.00,
      "currency": "AUD",
      "email": "user@example.com",
      "createdAt": "2025-01-15T12:00:00.000Z",
      "usedCount": 2,
      "lastUsedAt": "2025-01-16T08:30:00.000Z"
    }
  }
}
```

**Features:**
- Unlimited device unlocks per code
- Tracks usage count and last used date
- Simple JSON storage (no database needed)

## Security

- ✅ Card details never touch your server (Square handles tokenization)
- ✅ Payment processing by Square (PCI compliant)
- ✅ Unlock codes are random and unpredictable
- ✅ Server-side validation prevents fake codes
- ✅ HTTPS required in production

## Pricing

Square charges:
- **2.2% + 30¢** per online transaction in Australia
- For a $9 AUD payment: ~$0.50 fee
- Your net: ~$8.50 per sale

## Support

- [Square Documentation](https://developer.squareup.com/docs/web-payments/overview)
- [Square Sandbox Testing](https://developer.squareup.com/docs/devtools/sandbox/payments)
- [Square API Reference](https://developer.squareup.com/reference/square)

## Troubleshooting

### "Square SDK not loaded"
- Check your `VITE_SQUARE_APP_ID` is set correctly
- Ensure you're using the correct environment (Sandbox vs Production)

### "Payment failed"
- Verify your Access Token and Location ID match
- Check Square Dashboard for payment errors
- Ensure test cards have future expiry dates

### "Invalid unlock code"
- Check `src/lib/server/data/unlock-codes.json` exists
- Verify code format: `TALK-XXXX-XXXX`
- Use `TALK-TEST-CODE` for development testing

## Files Changed

- `src/lib/server/unlockCodeStore.js` - Unlock code storage
- `src/routes/api/purchase-premium/+server.js` - Payment processing
- `src/routes/api/validate-code/+server.js` - Code validation
- `src/lib/components/premium/PremiumUnlockModal.svelte` - Payment UI
- `src/lib/components/Settings.svelte` - Code entry UI
- `.env.example` - Configuration template
