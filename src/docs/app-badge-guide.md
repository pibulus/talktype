# App Suffix Guide

## Overview

The `.app` suffix is an integral part of the product name that appears directly attached to the product titles across all Soft Stack apps. It serves as the finishing element of the brand name, using the same font and styling as the main wordmark but at a smaller size.

## Design Philosophy

The `.app` suffix follows these design principles:

1. **Brand Completion**: The suffix is a natural continuation of the product name
2. **Visual Cohesion**: It uses the same font and styling as the main wordmark
3. **Unifying Element**: Acts as a common identifier across the Soft Stack ecosystem
4. **Responsive**: Scales proportionally with the main title across different screen sizes

## Implementation

The AppSuffix is implemented as a reusable Svelte component that can be easily added to any product title.

### Basic Usage

```svelte
<script>
  import { AppSuffix } from '$lib/components/ui';
</script>

<h1>TalkType<AppSuffix /></h1>
```

### Props and Customization

The AppSuffix component accepts the following props:

- `color`: Text color (default: "inherit" - inherits from parent)
- `size`: Font size as percentage of parent (default: "70%")
- `customClass`: Optional additional CSS classes

```svelte
<AppSuffix 
  color="inherit"
  size="65%"
  customClass="title-suffix"
/>
```

## Styling Guidelines

- **Font**: Same as the main wordmark (inherited from parent)
- **Size**: 65-70% of the main wordmark size
- **Weight**: 600 to match the main wordmark's boldness
- **Letter spacing**: Same as the main wordmark
- **Color**: Same as main wordmark (inherited)
- **Background**: None - it's part of the text, not a separate element
- **Spacing**: Tight integration with minimal left margin
- **Positioning**: Inline with the main wordmark

## Brand Integration

When using the AppSuffix with different products, you can inherit the color from the main wordmark or use a slight variation:

- **TalkType**: `color: "inherit"` - Uses the same color as the main wordmark
- **SnipSite**: `color: "inherit"` - Uses the same color as the main wordmark
- **WordFlow**: `color: "inherit"` - Uses the same color as the main wordmark
- **CodeScribe**: `color: "inherit"` - Uses the same color as the main wordmark

You may optionally use a slightly lighter shade of the brand color for subtle differentiation.

## Usage Examples

### In AnimatedTitle Component

```svelte
<script>
  import { AppSuffix } from '$lib/components/ui';
  
  export let showAppSuffix = true;
  export let suffixColor = "inherit";
  export let suffixSize = "65%";
</script>

<h1>
  <span>TalkType</span>
  
  {#if showAppSuffix}
    <span>
      <AppSuffix 
        color={suffixColor}
        size={suffixSize}
        customClass="title-suffix"
      />
    </span>
  {/if}
</h1>
```

### In Navigation Bar

```svelte
<nav class="flex items-center space-x-6">
  <div class="text-lg font-bold">
    TalkType<AppSuffix size="60%" />
  </div>
  <a href="#" class="text-gray-600 hover:text-gray-900">Features</a>
  <a href="#" class="text-gray-600 hover:text-gray-900">Pricing</a>
</nav>
```

### In Footer

```svelte
<footer class="text-sm text-gray-500">
  © 2025 TalkType<AppSuffix size="60%" /> — All rights reserved.
</footer>
```

## Browser Support

The AppSuffix component uses standard CSS features with excellent browser support:

- CSS variables for customization
- Font inheritance for visual consistency
- Simple sizing based on percentages
- Standard inline text positioning

No special polyfills or fallbacks are required for modern browsers.

## Demo Page

A demonstration page showing various configurations of the AppSuffix is available at:

```
/ui-components
```

Visit this route to see examples of the AppSuffix in different contexts and with different sizing options.