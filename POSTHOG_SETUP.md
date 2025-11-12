# PostHog Analytics Setup

Quick guide to enable analytics tracking for TalkType.

## Why PostHog?

Tracks the **80/20** - only what matters for revenue:

- **Conversion funnel**: How many see premium modal → start payment → complete
- **Feature discovery**: Which locked features drive upgrades
- **Campaign performance**: Countdown views vs conversions
- **Multi-device usage**: Unlock code validation tracking
- **Engagement**: Transcription completions

## Setup (5 minutes)

### 1. Get PostHog Account

Already have one? Great! If not:

- Visit https://app.posthog.com/signup
- Free tier: 1M events/month (more than enough)

### 2. Get Your Project Key

1. Go to https://app.posthog.com/project/settings
2. Copy your **Project API Key** (starts with `phc_...`)

### 3. Install PostHog

```bash
npm install posthog-js
```

### 4. Add to .env

```bash
# Copy .env.example to .env if you haven't
cp .env.example .env

# Add your PostHog key
VITE_POSTHOG_KEY=phc_your_key_here
```

### 5. Done!

Analytics will automatically initialize on app load. Check your PostHog dashboard to see events flowing in.

## Events Being Tracked

### Conversion Funnel

- `premium_modal_viewed` - User opens premium modal
  - Properties: `triggered_by` (which locked feature they clicked)
- `payment_started` - User clicks "Pay" button
  - Properties: `amount`, `currency`
- `payment_completed` - Payment succeeds
  - Properties: `amount`, `currency`, `unlock_code`
  - Sets user property: `is_premium: true`

### Feature Discovery

- `locked_feature_clicked` - User clicks locked theme/prompt
  - Properties: `feature` (e.g., `theme_mint`, `custom_prompt`)

### Campaign

- `campaign_countdown_viewed` - User sees launch special countdown
  - Properties: `remaining`, `total`, `percentage_sold`

### Engagement

- `transcription_completed` - Successful transcription
  - Properties: `method` (gemini/whisper), `duration_seconds`, `word_count`

### Multi-Device

- `unlock_code_validated` - User enters unlock code on new device
  - Properties: `success` (true/false)

### Retention

- `pwa_installed` - User installs as PWA
- `transcript_history_viewed` - User opens history (premium feature)
  - Properties: `transcript_count`

## Key Metrics to Watch

### Conversion Rate

```
Visitors → Premium Modal → Payment Start → Payment Complete
```

**What to track:**

- % who see modal
- % who start payment (high drop-off = pricing issue)
- % who complete (high drop-off = payment UX issue)

### Feature-to-Revenue

```
Which locked features → highest conversion?
```

**What to track:**

- `triggered_by` property on `premium_modal_viewed`
- If "theme_mint" drives 50% of upgrades, that's your killer feature!

### Campaign Performance

```
Countdown urgency → conversion lift?
```

**What to track:**

- Do users convert more when <10 spots left?
- Compare conversion rate at 95/100 vs 10/100 remaining

### Multi-Device Adoption

```
How many use unlock code on 2nd device?
```

**What to track:**

- `unlock_code_validated` events
- Each event = user is using TalkType on multiple devices (good retention signal!)

## Privacy

Settings in `analytics.js`:

```javascript
{
  autocapture: false,            // Only track what we explicitly tell it
  disable_session_recording: true, // No session replays (respects privacy)
  capture_pageview: true          // Basic page views only
}
```

We track **what** users do (clicked premium modal), not **what** they transcribe. Transcripts never leave the device.

## Debugging

Check browser console for:

```
📊 Analytics: PostHog initialized
```

If you see:

```
📊 Analytics: Not configured (missing VITE_POSTHOG_KEY)
```

→ Add `VITE_POSTHOG_KEY` to your `.env` file

## Advanced: Custom Events

Add your own tracking:

```javascript
import { analytics } from '$lib/services/analytics';

// Track anything
analytics.track('custom_event_name', {
	property: 'value'
});
```

## Disable Analytics

Remove `VITE_POSTHOG_KEY` from `.env` and app works normally without tracking.

## Cost

PostHog free tier:

- 1M events/month
- Unlimited users
- 1 year data retention

For TalkType:

- ~10 events per user session
- 100,000 monthly users = 1M events
- You'll hit revenue before you hit limits 😉
