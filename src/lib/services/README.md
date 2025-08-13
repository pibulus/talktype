# TalkType Service Architecture

This directory contains the service layer for TalkType, restructured to use a modular architecture with event-based communication.

## Service Overview

The architecture consists of several key services:

- **EventBus**: Central communication hub for all services
- **AudioService**: Manages audio recording and processing
- **TranscriptionService**: Handles speech-to-text conversion
- **HapticService**: Provides haptic feedback on mobile devices

## Using the Services

### Basic Usage

```javascript
import { initializeServices } from '$lib/services';
import { onMount, onDestroy } from 'svelte';

// In your component script
let services;
let unsubscribers = [];

onMount(() => {
	// Initialize all services
	services = initializeServices({ debug: false });

	// Subscribe to audio state changes
	unsubscribers.push(
		services.eventBus.on('audio:stateChanged', (data) => {
			console.log('Audio state changed:', data.currentState);
		})
	);

	// Subscribe to transcription completion
	unsubscribers.push(
		services.eventBus.on('transcription:completed', (data) => {
			console.log('Transcription complete:', data.text);
		})
	);
});

onDestroy(() => {
	// Clean up subscriptions
	unsubscribers.forEach((unsub) => unsub());
});

// Start recording function
async function startRecording() {
	try {
		await services.audioService.startRecording();
	} catch (error) {
		console.error('Failed to start recording:', error);
	}
}

// Stop recording and transcribe
async function stopAndTranscribe() {
	try {
		const audioBlob = await services.audioService.stopRecording();
		if (audioBlob) {
			await services.transcriptionService.transcribeAudio(audioBlob);
		}
	} catch (error) {
		console.error('Failed to transcribe:', error);
	}
}
```

### AudioToText Component Integration

Instead of containing all functionality directly, AudioToText.svelte would now:

1. Initialize services using `initializeServices()`
2. Subscribe to events from the services
3. Update UI state based on service events
4. Call service methods for recording/transcription operations

## Event Types

### Audio Events

- `audio:recordingStarted` - Recording has started
- `audio:recordingStopped` - Recording has stopped
- `audio:recordingError` - Error during recording
- `audio:stateChanged` - Audio service state has changed
- `audio:waveformData` - New waveform data available for visualization

### Transcription Events

- `transcription:started` - Transcription process has started
- `transcription:progress` - Transcription progress update
- `transcription:completed` - Transcription successfully completed
- `transcription:error` - Error during transcription
- `transcription:copied` - Transcript copied to clipboard
- `transcription:shared` - Transcript shared using Web Share API
