# Animation Dependency Graph for TalkType

This document provides a visual representation of the animation dependencies in the TalkType application, showing how different components interact and affect each other's animation states.

## State Variable Dependencies

```
+page.svelte                          AudioToText.svelte
---------------                       ------------------
isRecording       <--------------->   recording
                                      |
ambientBlinkingActive                 |
     |                                |
     v                                v
blinkTimeout                     animationFrameId
ambientBlinkTimeout              clipboardTimer
     |                                |
     v                                v
DOM Elements                     DOM Elements
---------------                  ---------------
eyesElement      <--------+      eyesElement (local)
iconBgElement              |      ghostIconElement (local)
iconContainer              |      progressContainerElement
                           |
                           +----> parentEyesElement (prop)
                           +----> parentGhostIconElement (prop)
```

## Animation Flow Sequence

### On Page Load

```
setupDomObserver()
      |
      v
 domReady = true
      |
      v
 greetingBlink()
      |
      +------> iconContainer.classList.add('ghost-wobble-greeting')
      |             |
      |             v
      |        setTimeout (1000ms)
      |             |
      |             v
      |        remove class
      v
setTimeout (2000ms)
      |
      v
 doubleClick() -----> blink() + blink()
      |
      v
setTimeout (500ms)
      |
      v
startAmbientBlinking()
      |
      v
ambientBlinkingActive = true
      |
      v
scheduleNextBlink() ---> setTimeout(random 4-9s) ---> blink()/doubleClick() ---> scheduleNextBlink()
```

### Recording Toggle Sequence

```
startRecordingFromGhost(click)
     |
     +----> if(!isCurrentlyRecording) START RECORDING:
     |            |
     |            +----> isRecording = true
     |            +----> stopAmbientBlinking()
     |            +----> clearBlinkTimeout()
     |            +----> eyes.classList.remove('blink-once', 'blink-thinking-hard')
     |            +----> add wobble animation
     |            +----> setTimeout -----> blink() or doubleClick()
     |            +----> setTimeout -----> currentIconContainer.classList.add('recording')
     |            +----> audioToTextComponent.startRecording()
     |
     +----> if(isCurrentlyRecording) STOP RECORDING:
                  |
                  +----> isRecording = false
                  +----> currentIconContainer.classList.remove('recording')
                  +----> add wobble animation
                  +----> audioToTextComponent.stopRecording()
                         |
                         v
                  mediaRecorder.onstop
                         |
                         +----> add wobble animation to ghost
                         +----> audioBlob processing
                         +----> transcribing = true
                         +----> animate progress bar
                         +----> ghostThinkingHard() [empty now]
                         +----> transcription
                         +----> completeProgress()
                         +----> handleCompletionEffects()
                         +----> recording = false
```

## Theme Animation Dependencies

```
applyTheme(vibeId)
      |
      +----> localStorage.setItem("talktype-vibe", vibeId)
      |
      +----> document.documentElement.setAttribute('data-theme', vibeId)
      |
      +----> Update iconBgElement.src based on theme
              |
              +----> mint    -> '/talktype-icon-bg-gradient-mint.svg'
              +----> bubblegum -> '/talktype-icon-bg-gradient-bubblegum.svg'
              +----> rainbow -> '/talktype-icon-bg-gradient-rainbow.svg' + 'rainbow-animated' class
              +----> default -> '/talktype-icon-bg-gradient.svg'
```

## Critical Timing Dependencies

1. **Ambient Blinking System:**
   - Requires `domReady` to be true
   - Cannot run when `isRecording` is true
   - Clears existing timeouts with `clearAmbientBlinkTimeout()` before starting new schedule
   - Recursive scheduling with random intervals between 4-9 seconds

2. **Animation Cleanup:**
   - Critical timeouts must be cleared:
     - `blinkTimeout` - Active blink animation
     - `ambientBlinkTimeout` - Ambient scheduling
     - `animationFrameId` - Progress bar animation
     - `clipboardTimer` - Copy feedback message

3. **Force Reflow Points:**
   - Used to ensure animations apply correctly after class changes
   - Key locations:
     - `void element.offsetWidth` after changing icon gradient src
     - Before adding new animation classes after removing old ones

## CSS Animation Dependencies

1. **Class-Based Animations:**
   - 'blink-once' - Single blink animation (180ms)
   - 'ghost-wobble-left'/'ghost-wobble-right' - Directional wobble (600ms)
   - 'ghost-wobble-greeting' - Welcome wobble (1000ms)
   - 'recording' - Recording state visual indicator
   - 'completion-pulse' - Transcription complete effect (600ms)
   - 'rainbow-animated' - Theme-specific animation for rainbow theme

2. **Animation Coordination:**
   - Critical to avoid simultaneous conflicting animations
   - State transitions must be clean with appropriate pauses between animations