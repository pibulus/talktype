# 🎤 TalkType Project System Documentation

This document provides essential information for maintaining and extending the TalkType application, a voice-to-text transcription service with animated SVG components.

## Project Overview

TalkType is a lightweight, browser-based voice transcription tool with the following features:
- Real-time audio recording and visualization
- Text transcription using AI services
- Responsive design for all device sizes
- Interactive animated SVG icon as the primary UI element

## Technology Stack

### Framework & UI
- **SvelteKit**: Primary framework for reactive UI components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **DaisyUI**: Component library built on Tailwind

### Audio & Transcription
- **WebAudio API**: For audio recording and visualization
- **MediaRecorder API**: For capturing audio streams
- **AI Service**: External API for speech-to-text conversion

## Code Style Guidelines

- **JavaScript**: Standard JS (not TypeScript) with JSConfig for minimal type checking
- **Component Structure**: Use Svelte's built-in component system
- **State Management**: Use Svelte's reactive stores where appropriate
- **Animation**: Leverage CSS for declarative animations, enhanced with JavaScript
- **Naming**: Use descriptive camelCase for variables, PascalCase for components

## Browser Compatibility

TalkType is designed to work with modern browsers:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari (latest 2 versions)

## Important Considerations

### Audio Recording
- Always check for browser permissions before attempting to record
- Provide clear feedback when recording starts/stops
- Handle iOS Safari-specific audio quirks with appropriate fallbacks

### SVG Animation
- See the comprehensive SVG animation guide in `src/docs/animated-svg-icon-reference.md`
- Always separate animated elements into distinct SVG components
- Use CSS for baseline animations and JS for enhanced interactions
- Test animations across browser/device combinations

### SSR Considerations
- ⚠️ Avoid direct window/document references in component initialization
- Use onMount() for browser-only code to prevent SSR errors
- Check for browser environment before accessing browser APIs

## Development Workflow

- **Development**: `npm run dev`
- **Building**: `npm run build`
- **Preview**: `npm run preview`
- **Formatting**: `npm run format`
- **Linting**: `npm run lint`

## Example Code

```javascript
// Example: Proper browser API use in Svelte
import { onMount } from 'svelte';

let audioContext;

onMount(() => {
  // Safe to access browser APIs here
  if (typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  return () => {
    // Cleanup when component unmounts
    if (audioContext) {
      audioContext.close();
    }
  };
});
```

By following these guidelines, you'll help maintain the TalkType project's consistency and quality. 🚀