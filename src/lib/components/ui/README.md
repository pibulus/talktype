# UI Components

This directory contains reusable UI components used throughout the TalkType application.

## Components

### AppSuffix

`AppSuffix.svelte` is a specialized component that adds the ".app" suffix to the TalkType brand name.

#### Usage

```svelte
<script>
  import { AppSuffix } from '$lib/components/ui';
</script>

<h1>
  TalkType
  <span class="suffix-container">
    <AppSuffix />
  </span>
</h1>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | string | `"inherit"` | The text color of the suffix |
| `size` | string | `"55%"` | Size relative to parent (55% of parent font size) |
| `customClass` | string | `""` | Additional CSS classes |
| `offsetY` | string | `"0.2em"` | Vertical offset from baseline |
| `wiggleOnHover` | boolean | `true` | Whether to enable hover animation |

#### Implementation Details

The component uses absolute positioning to place the `.app` suffix in the bottom-right of the parent element. Key features:

1. **Positioning**: 
   - Uses absolute positioning with responsive adjustments
   - Parent container should have `position: relative` and ideally `width: 0` with `overflow: visible`

2. **Visual Style**:
   - Rotated -3° for an "off-kilter" appearance
   - Inherits font family and weight from parent
   - Subtle text shadow for dimensionality
   - 55% of parent font size

3. **Hover Effect**:
   - Subtle scale and additional rotation on hover
   - Smooth transitions for all animations

4. **Accessibility**:
   - Marked as `aria-hidden="true"` since it's decorative

5. **Responsive Behavior**:
   - Position and size adjusts across different screen sizes
   - Custom breakpoints for various device sizes

#### Example in AnimatedTitle

See `/src/lib/components/mainPage/AnimatedTitle.svelte` for a complete implementation example with proper centering and animation sequencing.