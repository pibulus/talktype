<script>
    import { createEventDispatcher } from 'svelte';
    
    // Props - all state is owned by parent
    export let currentTheme = 'peach';
    export let currentAnimation = 'none';
    export let eyePosition = 'center';
    export let isBlinking = false;
    export let ambientBlinking = true;
    export let isRecording = false;
    export let isProcessing = false;
    export let doingSpecialAnimation = false;
    export let isHoverSimulation = false;
    export let eyeTrackingEnabled = false;
    export let useThemeSpecificRecording = true;
    export let isRainbowSparkle = false;
    export let customAnimations = [];
    export let animationDescription = '';
    export let isGeneratingAnimation = false;
    export let animationError = '';
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Action handlers - just dispatch event, no state changes here
    function dispatchAction(type, details = {}) {
        dispatch('action', { type, ...details });
    }
    
    // Theme controls
    function setTheme(theme) {
        dispatch('themeChange', { theme });
    }
    
    // Animation controls
    function triggerAnimation(animation) {
        dispatch('animationChange', { animation });
    }
    
    // Eye position controls
    function setEyePosition(position) {
        dispatch('eyePositionChange', { position });
    }
    
    // Blink controls
    function toggleBlink() {
        dispatch('blinkChange', { isBlinking: !isBlinking });
    }
    
    function toggleAmbientBlinking() {
        dispatch('ambientBlinkingChange', { ambientBlinking: !ambientBlinking });
    }
    
    // State controls
    function toggleRecording() {
        dispatch('recordingChange', { isRecording: !isRecording });
    }
    
    function toggleProcessing() {
        dispatch('processingChange', { isProcessing: !isProcessing });
    }
    
    // Hover simulation
    function toggleHoverSimulation() {
        dispatch('hoverSimulationChange', { isHoverSimulation: !isHoverSimulation });
    }
    
    // Eye tracking
    function toggleEyeTracking() {
        dispatch('eyeTrackingChange', { eyeTrackingEnabled: !eyeTrackingEnabled });
    }
    
    // Theme specific recording
    function toggleThemeSpecificRecording() {
        dispatch('themeSpecificRecordingChange', { useThemeSpecificRecording: !useThemeSpecificRecording });
    }
    
    // Rainbow sparkle
    function toggleRainbowSparkle() {
        dispatch('rainbowSparkleChange', { isRainbowSparkle: !isRainbowSparkle });
    }
    
    // Animation generation
    function updateAnimationDescription(event) {
        dispatch('animationDescriptionChange', { description: event.target.value });
    }
    
    function generateAnimation() {
        dispatch('generateAnimation');
    }
    
    function applyCustomAnimation(animation) {
        dispatch('applyCustomAnimation', { animation });
    }
</script>

<div class="control-panel">
    <div class="control-grid">
        <!-- AI Animation Generator -->
        <div class="control-section ai-animation-generator">
            <h2>Generate Custom Animation</h2>
            <div class="input-container">
                <textarea
                    value={animationDescription}
                    on:input={updateAnimationDescription}
                    placeholder="Describe the animation you want in natural language (e.g., 'make the ghost bounce up and down 3 times')"
                    rows="3"
                    disabled={isGeneratingAnimation}
                ></textarea>
                <button
                    on:click={generateAnimation}
                    disabled={isGeneratingAnimation || !animationDescription.trim()}
                    class="generate-button"
                >
                    {isGeneratingAnimation ? 'Generating...' : 'Generate Animation'}
                </button>
                {#if animationError}
                    <p class="error-message">{animationError}</p>
                {/if}
            </div>
            
            <!-- Custom Animations List -->
            {#if customAnimations.length > 0}
                <div class="custom-animations">
                    <h3>Custom Animations</h3>
                    <div class="animation-list">
                        {#each customAnimations as animation}
                            <button
                                class="animation-button {currentAnimation === animation.name ? 'active' : ''}"
                                on:click={() => applyCustomAnimation(animation)}
                            >
                                {animation.name}
                                <span class="animation-target">({animation.target})</span>
                                <span class="animation-desc">{animation.description}</span>
                            </button>
                        {/each}
                    </div>
                    
                    <!-- Code Display Section -->
                    {#if currentAnimation !== 'none' && customAnimations.find((a) => a.name === currentAnimation)}
                        {@const activeAnimation = customAnimations.find(
                            (a) => a.name === currentAnimation
                        )}
                        <div class="animation-code-display">
                            <h4>Animation CSS Code</h4>
                            <div class="code-container">
                                <pre><code
                                        >{`.${activeAnimation.name} {
    animation: ${activeAnimation.name}-keyframes ${activeAnimation.duration}s ${activeAnimation.timing}
  ${activeAnimation.iteration};
  }

  @keyframes ${activeAnimation.name}-keyframes {
    ${activeAnimation.keyframes}
  }`}</code
                                    ></pre>
                                <button
                                    class="copy-button"
                                    on:click={() => {
                                        navigator.clipboard.writeText(`.${activeAnimation.name} {
  animation: ${activeAnimation.name}-keyframes ${activeAnimation.duration}s ${activeAnimation.timing} ${activeAnimation.iteration};
}

@keyframes ${activeAnimation.name}-keyframes {
  ${activeAnimation.keyframes}
}`);
                                    }}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        
        <!-- Left Column -->
        <div class="column">
            <!-- Quick Actions Panel -->
            <div class="control-section quick-actions">
                <h2>Quick Actions</h2>
                <div class="animation-buttons">
                    <button on:click={() => dispatchAction('greeting')}>Greeting</button>
                    <button on:click={() => dispatchAction('pulse')}>Pulse</button>
                    <button on:click={() => dispatchAction('fullAnimationSequence')}>Animation Sequence</button>
                    <button class:active={isRecording} on:click={toggleRecording}>
                        {isRecording ? 'Stop Recording' : 'Record'}
                    </button>
                    <button class:active={isProcessing} on:click={toggleProcessing}>
                        {isProcessing ? 'Stop Processing' : 'Process'}
                    </button>
                </div>
            </div>
            
            <div class="control-section">
                <h2>Theme Controls</h2>
                <div class="theme-buttons">
                    <button class:active={currentTheme === 'peach'} on:click={() => setTheme('peach')}>
                        Peach
                    </button>
                    <button class:active={currentTheme === 'mint'} on:click={() => setTheme('mint')}>
                        Mint
                    </button>
                    <button
                        class:active={currentTheme === 'bubblegum'}
                        on:click={() => setTheme('bubblegum')}
                    >
                        Bubblegum
                    </button>
                    <button
                        class:active={currentTheme === 'rainbow'}
                        on:click={() => setTheme('rainbow')}
                    >
                        Rainbow
                    </button>
                </div>
            </div>
            
            <div class="control-section">
                <h2>Basic Animations</h2>
                <div class="animation-buttons">
                    <button
                        class:active={currentAnimation === 'wobble-left'}
                        on:click={() => triggerAnimation('wobble-left')}
                    >
                        Wobble Left
                    </button>
                    <button
                        class:active={currentAnimation === 'wobble-right'}
                        on:click={() => triggerAnimation('wobble-right')}
                    >
                        Wobble Right
                    </button>
                    <button
                        class:active={currentAnimation === 'spin'}
                        on:click={() => triggerAnimation('spin')}
                    >
                        Spin
                    </button>
                    <button on:click={() => dispatchAction('specialAnimation')}>Easter Egg</button>
                </div>
            </div>
        </div>
        
        <!-- Right Column -->
        <div class="column">
            <div class="control-section">
                <h2>Eye Controls</h2>
                <div class="eye-position-controls">
                    <button
                        class:active={eyePosition === 'center'}
                        on:click={() => setEyePosition('center')}
                    >
                        Center
                    </button>
                    <button class:active={eyePosition === 'left'} on:click={() => setEyePosition('left')}>
                        Left
                    </button>
                    <button
                        class:active={eyePosition === 'right'}
                        on:click={() => setEyePosition('right')}
                    >
                        Right
                    </button>
                    <button class:active={eyePosition === 'up'} on:click={() => setEyePosition('up')}>
                        Up
                    </button>
                    <button class:active={eyePosition === 'down'} on:click={() => setEyePosition('down')}>
                        Down
                    </button>
                </div>
                
                <div class="blink-controls">
                    <button class:active={isBlinking} on:click={toggleBlink}>
                        {isBlinking ? 'Eyes Open' : 'Blink'}
                    </button>
                    <button class:active={ambientBlinking} on:click={toggleAmbientBlinking}>
                        {ambientBlinking ? 'No Ambient Blink' : 'Ambient Blink'}
                    </button>
                </div>
            </div>
            
            <div class="control-section">
                <h2>Eye Animations</h2>
                <div class="animation-buttons">
                    <button on:click={() => dispatchAction('startThinking')}>Start Thinking</button>
                    <button on:click={() => dispatchAction('stopThinking')}>Stop Thinking</button>
                    <button on:click={() => dispatchAction('reactToTranscript', { length: 'short' })}>React (Short)</button>
                    <button on:click={() => dispatchAction('reactToTranscript', { length: 'long' })}>React (Long)</button>
                </div>
                <div class="control-section">
                    <h2>Advanced Controls</h2>
                    <div class="animation-buttons">
                        <button on:click={() => dispatchAction('restartGrowAnimation')}>Restart Grow</button>
                        <button class:active={isHoverSimulation} on:click={toggleHoverSimulation}>
                            {isHoverSimulation ? 'Stop Hover Sim' : 'Hover Simulation'}
                        </button>
                        <button class:active={eyeTrackingEnabled} on:click={toggleEyeTracking}>
                            {eyeTrackingEnabled ? 'Stop Eye Tracking' : 'Mouse Eye Tracking'}
                        </button>
                        <button
                            class:active={useThemeSpecificRecording}
                            on:click={toggleThemeSpecificRecording}
                        >
                            {useThemeSpecificRecording ? 'Basic Recording' : 'Theme Recording'}
                        </button>
                        <button class:active={isRainbowSparkle} on:click={toggleRainbowSparkle}>
                            {isRainbowSparkle ? 'Stop Rainbow Sparkle' : 'Rainbow Sparkle'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .control-panel {
        background: #f0f0f0;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        overflow-y: auto;
        max-height: 58vh;
    }

    .control-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }
    
    .ai-animation-generator {
        grid-column: span 2;
        background: #f5f5f5;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .input-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 0.5rem;
        font-family: inherit;
        resize: vertical;
        min-height: 80px;
    }

    .generate-button {
        align-self: flex-end;
        background: #4f46e5;
        color: white;
        font-weight: 500;
        padding: 0.6rem 1.2rem;
    }

    .generate-button:disabled {
        background: #a5a5a5;
        cursor: not-allowed;
    }

    .error-message {
        color: #e53e3e;
        font-size: 0.9rem;
        margin-top: 0.5rem;
    }

    .custom-animations {
        margin-top: 1rem;
    }

    .custom-animations h3 {
        font-size: 1rem;
        margin-bottom: 0.75rem;
        color: #444;
    }

    .animation-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        max-height: 150px;
        overflow-y: auto;
        padding: 0.5rem;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 0.5rem;
    }

    .animation-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.5rem 0.75rem;
        font-size: 0.85rem;
        background: white;
        border: 1px solid #ddd;
        flex: 1 0 calc(33% - 0.5rem);
        min-width: 120px;
        max-width: 180px;
        text-align: center;
    }

    .animation-button.active {
        background: #4f46e5;
        color: white;
        border-color: #4338ca;
    }

    .animation-target {
        font-size: 0.7rem;
        opacity: 0.7;
        margin-top: 0.2rem;
    }

    .animation-desc {
        font-size: 0.7rem;
        margin-top: 0.3rem;
        opacity: 0.8;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }

    .animation-code-display {
        margin-top: 1rem;
        background: #f8f8f8;
        border-radius: 0.5rem;
        padding: 1rem;
        border: 1px solid #e0e0e0;
    }

    .animation-code-display h4 {
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
        color: #333;
    }

    .code-container {
        position: relative;
        background: #2d2d2d;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-top: 0.5rem;
        overflow: auto;
        max-height: 250px;
    }

    .code-container pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        color: #f8f8f8;
        font-size: 0.85rem;
        white-space: pre-wrap;
    }

    .copy-button {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: rgba(255, 255, 255, 0.1);
        color: #f8f8f8;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
    }

    .copy-button:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .quick-actions {
        grid-column: span 2;
    }

    .quick-actions .animation-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 0.5rem;
    }
    
    .control-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #ddd;
    }

    .control-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }

    h2 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        color: #444;
    }

    .theme-buttons,
    .animation-buttons,
    .eye-position-controls,
    .blink-controls,
    .state-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    button {
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 0.5rem;
        padding: 0.4rem 0.8rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
    }

    button:hover {
        background: #f0f0f0;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    button.active {
        background: #4f46e5;
        color: white;
        border-color: #4338ca;
    }
    
    /* Scrollbar styling */
    .control-panel::-webkit-scrollbar {
        width: 8px;
    }

    .control-panel::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }

    .control-panel::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
    }

    .control-panel::-webkit-scrollbar-thumb:hover {
        background: #aaa;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .control-grid {
            grid-template-columns: 1fr;
        }
        
        .ai-animation-generator,
        .quick-actions {
            grid-column: span 1;
        }
        
        .control-panel {
            max-height: none;
            overflow-y: visible;
        }
    }
    
    @media (max-width: 500px) {
        .control-panel {
            padding: 1rem;
        }
        
        button {
            padding: 0.3rem 0.6rem;
            font-size: 0.85rem;
        }
        
        h2 {
            font-size: 1.1rem;
        }
    }
</style>