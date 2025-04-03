# TalkType Future Plans

This document outlines planned features and enhancements for the TalkType application.

## Settings Panel Implementation

### Placement Options

- **Bottom-Left Corner**: Small gear/settings icon with non-intrusive design
- **Bottom-Right Corner**: Alternative placement if bottom-left conflicts with other elements
- **Accessibility Consideration**: Ensure proper contrast and touch target size (min 44×44px)

### Settings Features

#### Recording Options

- [ ] **Start Recording on Load**: Toggle to automatically start recording when the page loads
  - Implementation: Store user preference in localStorage
  - Add conditional check in onMount hook to autostart recording
  ```javascript
  onMount(() => {
  	// Check for autostart preference
  	const autoStartRecording = localStorage.getItem('settings_autoStartRecording') === 'true';
  	if (autoStartRecording && audioToTextComponent) {
  		// Small delay to ensure component is fully mounted
  		setTimeout(() => audioToTextComponent.startRecording(), 1000);
  	}
  });
  ```

#### Visual Customization

- [ ] **Ghost Gradient Customization**: Allow users to select from predefined gradient options

  - Implementation: Store theme preference in localStorage
  - Apply custom CSS variables based on selected theme

  ```css
  /* Theme variables */
  :root {
  	--ghost-gradient-from: #ffb6c1;
  	--ghost-gradient-to: #dda0dd;
  	--visualizer-color-primary: #ff7eb9;
  	--visualizer-color-secondary: #7eb6ff;
  }

  /* Custom theme class example */
  :global(.theme-ocean) {
  	--ghost-gradient-from: #7eb6ff;
  	--ghost-gradient-to: #65c8d0;
  	--visualizer-color-primary: #5a9eff;
  	--visualizer-color-secondary: #65c8d0;
  }
  ```

- [ ] **Audio Visualizer Colors**: Customize the colors used in the audio visualizer
  - Implement theme toggle buttons with previews
  - Ensure all themes maintain proper contrast and accessibility

#### Persistence

- [ ] **Saved Settings**: Store user preferences using localStorage or IndexedDB
- [ ] **Settings Reset**: Option to reset to default settings

## UI Enhancement Plan

### Animation Effects

Implement subtle UI enhancements using these techniques from our effects cheat sheet:

1. **Ghost Icon**:

   - [ ] Idle Wiggle/Blink: Enhance the existing ambient animation system
   - [ ] Mic Volume Glow: Integrate with mic input to make ghost glow intensity match volume

2. **Text Elements**:

   - [ ] Staggered Text for the main TalkType heading on initial load
   - [ ] Slide-In animation for the transcript when it appears

3. **Buttons & Interactive Elements**:
   - [ ] Button Press Bounce: Apply to recording button for tactile feedback
   - [ ] Glow Pulse on active recording state (enhance existing implementation)
   - [ ] Confetti Pop when transcription completes successfully

### Settings Panel Design

Create a minimal, non-intrusive settings panel with the following characteristics:

1. **Icon Design**:

   - Simple gear or sliders icon
   - Subtle ambient animation (Idle Wiggle)
   - Semi-transparent until hovered

2. **Panel UI**:

   - Slide-in panel animation (from bottom or side)
   - Glassmorphism effect for the settings container
   - Toggle switches for boolean options
   - Color pickers or preset buttons for theme options

3. **Implementation Example**:

```svelte
<div class="settings-container">
	<button
		class="settings-toggle"
		on:click={() => (settingsOpen = !settingsOpen)}
		aria-label="Settings"
	>
		<svg class="settings-icon"><!-- Gear icon SVG --></svg>
	</button>

	{#if settingsOpen}
		<div class="settings-panel" transition:slide={{ duration: 300 }}>
			<h3>Settings</h3>

			<div class="setting-group">
				<label for="autostart">
					<input
						type="checkbox"
						id="autostart"
						bind:checked={autoStartRecording}
						on:change={saveSettings}
					/>
					Start recording on page load
				</label>
			</div>

			<div class="setting-group">
				<h4>Theme</h4>
				<div class="theme-options">
					{#each themes as theme}
						<button
							class="theme-button"
							class:selected={currentTheme === theme.id}
							on:click={() => setTheme(theme.id)}
							style="background: linear-gradient(to right, {theme.gradientFrom}, {theme.gradientTo})"
						></button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
```

## Implementation Priority

1. **Phase 1**: Settings toggle icon and basic panel structure
2. **Phase 2**: Auto-start recording functionality
3. **Phase 3**: Theme customization options
4. **Phase 4**: Additional UI animations and enhancements

## Technical Considerations

- **Performance**: Ensure all animations maintain 60fps, even on mobile devices
- **Accessibility**: All features must be keyboard navigable and work with screen readers
- **Responsive Design**: Settings panel must adapt gracefully to all screen sizes
- **Browser Support**: Test in Chrome, Firefox, Safari, and Edge (latest versions)
- **Animation Toggle**: Consider adding option to reduce animations for users with vestibular disorders

---

These planned enhancements aim to add customization options while maintaining the clean, focused experience that makes TalkType effective.
