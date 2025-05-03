<script>
    import { createEventDispatcher } from 'svelte';
    
    // Props
    export let isHoverSimulation = false;
    export let eyeTrackingEnabled = false;
    export let useThemeSpecificRecording = true;
    export let isRainbowSparkle = false;
    export let currentTheme = 'peach';
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Action handlers
    function restartGrowAnimation() {
        dispatch('action', { type: 'restartGrowAnimation' });
    }
    
    function toggleHoverSimulation() {
        dispatch('hoverSimulationChange', { isHoverSimulation: !isHoverSimulation });
    }
    
    function toggleEyeTracking() {
        dispatch('eyeTrackingChange', { eyeTrackingEnabled: !eyeTrackingEnabled });
    }
    
    function toggleThemeSpecificRecording() {
        dispatch('themeSpecificRecordingChange', { useThemeSpecificRecording: !useThemeSpecificRecording });
    }
    
    function toggleRainbowSparkle() {
        if (currentTheme !== 'rainbow') {
            // Auto-switch to rainbow theme if not already
            dispatch('themeChange', { theme: 'rainbow' });
        }
        
        dispatch('rainbowSparkleChange', { isRainbowSparkle: !isRainbowSparkle });
    }
</script>

<div class="control-section">
    <h2>Advanced Controls</h2>
    <div class="animation-buttons">
        <button on:click={restartGrowAnimation}>Restart Grow</button>
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

<style>
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

    .animation-buttons {
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
</style>