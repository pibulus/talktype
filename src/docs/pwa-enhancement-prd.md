# Product Requirements Document: TalkType PWA Enhancement

## Overview

TalkType currently has a baseline Progressive Web App (PWA) implementation with the essential technical requirements met (manifest, service worker, and icons). However, users aren't being actively encouraged to install the app, and the home screen icon experience could be improved to better showcase the brand.

This PRD outlines the requirements for enhancing TalkType's PWA implementation to boost installation rates and improve the home screen appearance.

## Objectives

1. Increase PWA installation rates by implementing a custom installation prompt
2. Improve home screen icon visual quality by using layered SVG approach
3. Create a seamless, branded experience from installation to launch
4. Track and measure PWA usage and installation metrics

## User Experience Requirements

### 1. Installation Prompt

#### 1.1 Eligibility and Timing
- Show custom installation prompt after **3 successful transcriptions**
- Re-prompt users who didn't install after **7 days** and **5 more transcriptions**
- Never prompt more than **3 times** total
- Store prompt status in `localStorage` to maintain state across sessions

#### 1.2 Prompt UI Design
- Implementation: Bottom slide-up banner that doesn't interrupt workflow
- Visual Style: Match TalkType's design with ghost icon animation
- Content:
  - Primary message: "Add TalkType to your home screen for faster access"
  - Secondary message: "Use anytime, even offline"
  - Primary CTA: "Install Now" (triggers native install flow)
  - Secondary CTA: "Maybe Later" (dismisses for current session)
  - Optional: "Don't Ask Again" (permanent dismissal)
- Transition: Smooth animation in/out with slight bounce effect
- Dismissible: Swipe down or X button to close

#### 1.3 Platform-specific Behavior
- iOS: Show custom instructions explaining how to add to home screen via Safari share sheet
- Android/Desktop: Integrate with browser's native install API
- Detect installed status to avoid prompting users who already installed

### 2. Home Screen Icon Implementation

#### 2.1 Icon Design Requirements
- Primary Icon: Use the full TalkType ghost with peach gradient background
- Ensure proper visibility on both light and dark home screens
- Icon should be immediately recognizable as TalkType
- Maintain brand identity across all platforms

#### 2.2 Technical Specifications
- Create high-quality PNG renders of the layered SVG ghost at all required sizes
- For optimal quality:
  - Render SVG layers (background gradient, ghost outline, eyes)
  - Apply subtle drop shadow for better visibility on various backgrounds
  - Ensure crisp rendering at all sizes without pixelation
- Generate platform-specific assets:
  - iOS: Properly formatted apple-touch-icon with radius matching iOS standards
  - Android: Maskable icon with safe zone for adaptive shapes
  - Windows: Generate transparent PNG with proper padding for tile icons

#### 2.3 App Launch Experience
- Create smooth transition from tap to app launch
- Implement a branded splash screen matching icon aesthetics
- Ensure color theme consistency between icon, splash screen, and app UI

### 3. Usage Tracking

#### 3.1 Installation Analytics
- Track installation prompt:
  - Display count
  - Interaction rate (accept/dismiss/ignore)
  - Time to decision
- Track actual installations (using `beforeinstallprompt` and `appinstalled` events)
- Measure retention differences between installed and non-installed users

#### 3.2 PWA-specific Metrics
- Track offline usage
- Measure time spent in app when launched from home screen vs browser
- Identify feature usage differences between installed and non-installed users

## Technical Requirements

### 1. PWA Installation Prompt Component

- Create a reusable `<InstallPrompt>` component in Svelte
- Implement logic to detect browser support for installation
- Store and retrieve prompt state in localStorage
- Handle all platform variations (iOS instructions vs native prompt)
- Ensure compatibility with service worker implementation

### 2. Icon Generation Pipeline

- Create a build script to generate all required icon assets
- Optimize SVG rendering for crispness at all sizes
- Generate platform-specific variants with proper metadata
- Include theme-aware variations for light/dark mode

### 3. App Shell Optimization

- Ensure critical UI loads instantly from cache
- Implement placeholder UI during content loading
- Create smooth transition between splash screen and interactive UI

## Success Metrics

- **Installation Rate**: Target 15% of return visitors installing the PWA
- **Retention**: 25% higher retention for users with installed PWA vs browser users
- **Engagement**: 40% longer average session duration for installed PWA users
- **Offline Usage**: Track and increase meaningful offline sessions

## Implementation Priority

1. **Custom Installation Prompt** (Highest Priority)
   - Most impactful for driving PWA adoption
   - Relatively simple implementation with high ROI

2. **Enhanced Icon Generation**
   - Improves brand recognition on home screens
   - Technical implementation via build pipeline

3. **Usage Tracking**
   - Provides data for ongoing optimization
   - Can be implemented gradually

## Future Considerations

- **Background Sync**: Add support for queuing transcriptions when offline
- **Share Target**: Register as a share target for audio files
- **Periodic Background Sync**: Regular content updates when supported
- **App Shortcut Management**: Dynamic shortcuts based on user behavior