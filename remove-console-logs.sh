#!/bin/bash

# Script to remove all console.log statements from production code
# while preserving error and warning logs where appropriate

echo "🧹 Removing console.log statements from production code..."

# Count before
BEFORE_COUNT=$(grep -r "console\." src --include="*.js" --include="*.svelte" | wc -l)
echo "Found $BEFORE_COUNT console statements before cleanup"

# Files to clean - Ghost system first
FILES=(
    "src/lib/components/ghost/stores/ghostStateStore.js"
    "src/lib/components/ghost/Ghost.svelte"
    "src/lib/components/ghost/ghostService.js"
    "src/lib/components/ghost/ghostStore.js"
    "src/lib/components/ghost/actions/initialGhostAnimation.js"
    "src/lib/components/mainPage/MainContainer.svelte"
    "src/lib/components/mainPage/audio-transcript/AudioToText.svelte"
    "src/lib/services/geminiService.js"
    "src/lib/services/geminiApiService.js"
)

# Remove console.log statements but keep console.error
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Cleaning $file..."
        # Remove standalone console.log lines
        sed -i '' '/^\s*console\.log(/d' "$file"
        # Remove console.debug lines
        sed -i '' '/^\s*console\.debug(/d' "$file"
        # Remove console.warn lines that are just for debugging
        sed -i '' '/console\.warn.*\[.*Debug.*\]/d' "$file"
        # Remove multi-line console.logs (careful with this)
        sed -i '' '/console\.log(/,/);$/d' "$file"
    fi
done

# Clean up all remaining console.logs in src
find src -type f \( -name "*.js" -o -name "*.svelte" \) -exec sed -i '' '/^\s*console\.log(/d' {} \;

# Count after
AFTER_COUNT=$(grep -r "console\." src --include="*.js" --include="*.svelte" | wc -l)
echo "✅ Cleanup complete! Reduced from $BEFORE_COUNT to $AFTER_COUNT console statements"
echo "Removed $(($BEFORE_COUNT - $AFTER_COUNT)) console statements"