# PageHeader

Shared header for full-screen pages. Keeps layout uniform: back arrow or close icon, page title, optional right-side action.

## Usage

```tsx
import { PageHeader } from "@/components/PageHeader";

// Back arrow on the left (default)
<PageHeader
  onBack={() => router.back()}
  title="Page title"
  rightSlot={<Pressable><Text>Add</Text></Pressable>}
/>

// Close (X) icon on the right
<PageHeader
  onBack={() => router.back()}
  title="Measurement profiles"
  variant="close"
  rightSlot={...}
/>
```

## Props

| Prop            | Type                | Description                                                      |
| --------------- | ------------------- | ---------------------------------------------------------------- |
| `onBack`        | `() => void`        | Called when the back or close control is pressed.                |
| `title`         | `string`            | Page title (center, single line truncated).                      |
| `variant`       | `'back' \| 'close'` | Optional. Default `'back'`. Back arrow left, or close (X) right. |
| `rightSlot`     | `ReactNode`         | Optional. Right-side action. With `close`, appears left of X.    |
| `showBackLabel` | `boolean`           | Optional. If true, shows "Back" next to arrow (variant back).    |
| `style`         | `ViewStyle`         | Optional. Override header container style.                       |

## Theme

Uses `atelier.background`, `atelier.panelBorder`, `atelier.cta`, `atelier.accent`, `typography`, `spacing`. No hardcoded colors.

## Used on

- Order detail (`order/[reference]`)
- Chat thread (`chat/[id]`) — with `showBackLabel`
- Measurement list (`measurements/index`) — with `rightSlot` "Add"
- New measurement profile (`measurements/create`)
- Edit measurement profile (`measurements/[id]/edit`)
