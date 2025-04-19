# TalkType PWA Installation Prompt & Home Screen Icon Enhancement

This PRD outlines how to implement a custom PWA installation prompt and improve the home screen icon experience for TalkType.

## 1. Custom Installation Prompt

### Overview
Create a custom banner that reminds users to install TalkType to their home screen after a set number of uses. This will supplement the browser's native installation prompts with a more branded, user-friendly experience.

### Requirements

#### 1.1 Trigger Logic
- Show the installation prompt after **3 successful transcriptions**
- If dismissed, show again after **7 days** if the user has had **5 more transcriptions**
- Never show more than **3 times** total per user
- Store prompt history in `localStorage` to maintain state across sessions

#### 1.2 UI Design
- Bottom slide-up banner matching TalkType's design system
- Subtle animation with ghost icon
- Non-intrusive placement that doesn't block main functionality
- Message: "Add TalkType to your home screen for faster access"
- Primary CTA: "Install Now" (triggers native install flow)
- Secondary CTA: "Maybe Later" (dismisses for current session)
- Option to dismiss permanently: "Don't Ask Again"

#### 1.3 Platform Detection
- iOS Safari: Show custom instructions with screenshots explaining how to add to home screen
- Android/Desktop: Use the Web App Install API to trigger the native install prompt
- Never show the prompt if the app is already installed (via `navigator.standalone` or `display-mode: standalone` media query)

#### 1.4 Implementation

**1. Installation State Management**
```javascript
// Tracking in localStorage
function getPWADisplayCount() {
  return parseInt(localStorage.getItem('talktype-pwa-display-count') || '0');
}

function getTranscriptionCount() {
  return parseInt(localStorage.getItem('talktype-transcription-count') || '0');
}

function wasPromptLastDismissed() {
  const lastDismissed = localStorage.getItem('talktype-pwa-last-dismissed');
  if (!lastDismissed) return false;
  
  // Check if 7 days have passed
  const dismissDate = new Date(parseInt(lastDismissed));
  const daysSinceDismiss = Math.floor((Date.now() - dismissDate) / (1000 * 60 * 60 * 24));
  return daysSinceDismiss < 7;
}

function shouldShowPWAPrompt() {
  // Already using as PWA - don't show
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    return false;
  }
  
  // Check if permanently dismissed
  if (localStorage.getItem('talktype-pwa-never-again') === 'true') {
    return false;
  }
  
  // Check display count
  const displayCount = getPWADisplayCount();
  if (displayCount >= 3) {
    return false;
  }
  
  // Recently dismissed - don't show
  if (wasPromptLastDismissed()) {
    return false;
  }
  
  // Check transcription threshold
  const transcriptionCount = getTranscriptionCount();
  
  if (displayCount === 0 && transcriptionCount >= 3) {
    return true; // First time showing after 3 transcriptions
  }
  
  if (displayCount > 0 && transcriptionCount >= 5) {
    return true; // Subsequent times after 5 more transcriptions
  }
  
  return false;
}
```

**2. BeforeInstallPrompt API Integration**

```javascript
// Store install prompt event for later use
let deferredInstallPrompt = null;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default prompt display
  e.preventDefault();
  
  // Save the event for later
  deferredInstallPrompt = e;
  
  // Check if we should show our custom prompt
  checkAndShowInstallPrompt();
});

// Function to show install prompt
function checkAndShowInstallPrompt() {
  if (shouldShowPWAPrompt()) {
    showCustomInstallUI();
    
    // Increment display count
    localStorage.setItem('talktype-pwa-display-count', 
      (getPWADisplayCount() + 1).toString());
  }
}

// Function to trigger install
function triggerInstall() {
  if (deferredInstallPrompt) {
    // Show the browser install prompt
    deferredInstallPrompt.prompt();
    
    // Wait for user response
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        // Mark as dismissed for timing
        localStorage.setItem('talktype-pwa-last-dismissed', Date.now().toString());
      }
    });
  } else if (isIOS()) {
    // Show iOS-specific instructions
    showIOSInstallInstructions();
  }
}
```

**3. Custom UI Component**

Create a `<InstallPrompt>` Svelte component with:
- Bottom slide-up banner design
- Ghost icon animation
- Platform-specific instructions
- Clear CTAs for install/dismiss
- Smooth animation for entry/exit
- A "Never ask again" option

## 2. Home Screen Icon Enhancement

### Overview
Improve the quality and appearance of TalkType's home screen icon across platforms, ensuring the full layered SVG approach with the peach gradient is properly represented.

### Requirements

#### 2.1 Icon Design Enhancements
- Create high-quality PNG renders of the layered SVG ghost
- Include the full gradient background in the rendered icons
- Ensure proper rendering on both light and dark home screens
- Maintain brand recognition across all platforms

#### 2.2 Technical Implementation

**1. Enhanced Icon Generation Script**

```javascript
/**
 * Generate high-quality layered icons by compositing SVGs and rendering to PNG
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Source SVG paths
const backgroundSVG = './static/assets/talktype-icon-bg-gradient.svg';
const outlineSVG = './static/assets/talktype-icon-outline.svg';
const eyesSVG = './static/assets/talktype-icon-eyes.svg';

// Required sizes for PWA icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a composite image from the layers
async function createCompositeIcon(size) {
  // Create a canvas
  const canvas = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="transparent"/>
    </svg>`
  );
  
  // Convert each SVG to a PNG buffer at the target size
  const bgBuffer = await sharp(backgroundSVG).resize(size, size).png().toBuffer();
  const outlineBuffer = await sharp(outlineSVG).resize(size, size).png().toBuffer();
  const eyesBuffer = await sharp(eyesSVG).resize(size, size).png().toBuffer();
  
  // Composite the layers
  return sharp(canvas)
    .composite([
      { input: bgBuffer, blend: 'over' },
      { input: outlineBuffer, blend: 'over' },
      { input: eyesBuffer, blend: 'over' }
    ])
    .png();
}

// Generate all required icon sizes
async function generateIcons() {
  for (const size of sizes) {
    const iconPath = `./static/icons/icon-${size}x${size}.png`;
    await createCompositeIcon(size).toFile(iconPath);
    console.log(`Generated ${iconPath}`);
  }
  
  // Also generate the favicon and apple-touch-icon
  await createCompositeIcon(32).toFile('./static/favicon.png');
  await createCompositeIcon(180).toFile('./static/apple-touch-icon.png');
  
  // Generate a maskable icon with proper safe area
  await generateMaskableIcon(512);
}

// Generate a maskable icon with proper safe area
async function generateMaskableIcon(size) {
  // Create a composite icon
  const compositeIcon = await createCompositeIcon(Math.floor(size * 0.8));
  
  // Calculate padding
  const padding = Math.floor((size - (size * 0.8)) / 2);
  
  // Create a larger transparent canvas with padding
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });
  
  // Composite the icon onto the canvas with padding
  await canvas
    .composite([{
      input: await compositeIcon.toBuffer(),
      top: padding,
      left: padding
    }])
    .png()
    .toFile(`./static/icons/icon-maskable-${size}x${size}.png`);
    
  console.log(`Generated maskable icon: icon-maskable-${size}x${size}.png`);
}

// Run the generation
generateIcons().catch(console.error);
```

**2. Manifest.json Updates**

Update the manifest to include the new maskable icon and ensure theme-aware icons are properly referenced.

```json
{
  "icons": [
    // Regular icons here...
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**3. Browser-specific Optimizations**

- Add meta tags for better iOS integration:
```html
<link rel="apple-touch-startup-image" href="/splash-screen.png">
<meta name="apple-mobile-web-app-title" content="TalkType">
```

- Generate platform-specific splash screens for a smoother launch experience

## Implementation Plan

1. **Phase 1: Installation Prompt Logic**
   - Implement tracking logic for transcription counts
   - Create the beforeinstallprompt event handler
   - Develop localStorage-based state management

2. **Phase 2: UI Component**  
   - Design and implement the InstallPrompt component
   - Create platform-specific variations
   - Add animation and ghost icon integration

3. **Phase 3: Icon Enhancement**
   - Develop the icon generation script
   - Generate the new composite icons
   - Update the manifest.json file
   - Test across platforms

## Success Metrics

- **Installation Rate**: Aim for 15% increase in PWA installations
- **User Satisfaction**: Survey users about the install experience
- **Icon Recognition**: Ensure the home screen icon is recognized as TalkType

## Testing Plan

- Test installation flow on iOS Safari
- Test installation flow on Android Chrome
- Test installation flow on desktop Chrome/Edge
- Verify icons appear correctly on home screens
- Validate tracking logic works as expected
- Ensure localStorage state is maintained correctly