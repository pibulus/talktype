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
	<span style="position: relative; display: inline-block; width: 0; height: 0; overflow: visible;">
		<AppSuffix offsetX="-0.3em" offsetY="8px" position="bottom-right" />
	</span>
</h1>
```

#### Props

| Prop            | Type    | Default          | Description                                                      |
| --------------- | ------- | ---------------- | ---------------------------------------------------------------- |
| `color`         | string  | `"inherit"`      | The text color of the suffix                                     |
| `size`          | string  | `"40%"`          | Size relative to parent (40% of parent font size)                |
| `customClass`   | string  | `""`             | Additional CSS classes                                           |
| `offsetX`       | string  | `"-0.2em"`       | Horizontal positioning offset                                    |
| `offsetY`       | string  | `"6px"`          | Vertical positioning offset                                      |
| `position`      | string  | `"bottom-right"` | Position preset (bottom-right, bottom-left, top-right, top-left) |
| `wiggleOnHover` | boolean | `true`           | Whether to enable hover animation                                |

#### Implementation Details

The component uses absolute positioning to place the `.app` suffix relative to the parent element with highly configurable positioning. Key features:

1. **Flexible Positioning**:
   - Uses absolute positioning with responsive adjustments
   - Parent container should have `position: relative` and ideally `width: 0` with `overflow: visible`
   - Supports four position presets: bottom-right, bottom-left, top-right, top-left
   - Fine-grained control with offsetX and offsetY parameters

2. **Visual Style**:
   - Rotated -2° for an "off-kilter" appearance
   - Inherits font family and weight from parent
   - Subtle text shadow for dimensionality
   - 40% of parent font size by default (adjustable)

3. **Hover Effect**:
   - Subtle scale and additional rotation on hover
   - Smooth transitions for all animations

4. **Accessibility**:
   - Marked as `aria-hidden="true"` since it's decorative

5. **Responsive Behavior**:
   - Position and size adjusts across different screen sizes
   - Custom breakpoints for various device sizes
   - Maintains proportional positioning across screen sizes
   - Works in all modern browsers with CSS variable support

#### Example in AnimatedTitle

See `/src/lib/components/mainPage/AnimatedTitle.svelte` for a complete implementation example with proper centering and animation sequencing.
