<script>
    import { createEventDispatcher } from 'svelte';
    
    // Props
    export let eyePosition = 'center';
    export let isBlinking = false;
    export let ambientBlinking = true;
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Eye position handler
    function setEyePosition(position) {
        dispatch('eyePositionChange', { position });
    }
    
    // Blink handlers
    function toggleBlink() {
        dispatch('blinkChange', { isBlinking: !isBlinking });
    }
    
    function toggleAmbientBlinking() {
        dispatch('ambientBlinkingChange', { ambientBlinking: !ambientBlinking });
    }
</script>

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

    .eye-position-controls,
    .blink-controls {
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