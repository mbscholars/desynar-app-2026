# AddActionPopover

Popover bubble shown above the tab bar add (plus) button. Presents a grid of actions: Upload design, Manage measurements, Create with AI.

## Usage

```tsx
import { AddActionPopover } from "@/components/AddActionPopover";

<AddActionPopover
  visible={addPopoverOpen}
  onClose={() => setAddPopoverOpen(false)}
  onUploadDesign={() => {}}
  onManageMeasurements={() => router.push("/measurements")}
  onCreateWithAi={() => {}}
/>;
```

## Props

| Prop                   | Type         | Description                                                |
| ---------------------- | ------------ | ---------------------------------------------------------- |
| `visible`              | `boolean`    | Controls visibility of the popover.                       |
| `onClose`              | `() => void` | Called when the user dismisses (backdrop tap or action).  |
| `onUploadDesign`       | `() => void` | Optional. Called when "Upload design" is pressed.          |
| `onManageMeasurements` | `() => void` | Optional. Called when "Manage measurements" is pressed.   |
| `onCreateWithAi`       | `() => void` | Optional. Called when "Create with AI" is pressed.        |

## Behavior

- **Bubble**: Rounded panel with a downward-pointing tail so it reads as coming from the plus button.
- **Animation**: Scale (0.95 → 1) and opacity (0 → 1) over `animation.normal` (200ms). Restrained, no bounce.
- **Dismissal**: Tapping the transparent backdrop calls `onClose`. Each grid action calls `onClose` then its callback.
- **Theme**: Uses `atelier.panel`, `atelier.panelBorder`, `radius.panel`, `typography`, `spacing`, `shadows.large`. No hardcoded colors beyond theme tokens.

## Accessibility

- Backdrop is pressable to close.
- Grid buttons use `accessibilityRole="button"` and `accessibilityLabel` (e.g. "Upload design").
- Add button in tab layout uses `accessibilityLabel` and `accessibilityState.expanded` when popover is open.

## Integration

Used in `app/(tabs)/_layout.tsx`. The add tab button toggles the popover (plus ↔ times) and does not navigate to the add screen while the popover is used.
