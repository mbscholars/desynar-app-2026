# Canvas assets — Make Your Own Outfit (optional)

The outfit builder currently uses a **form + container** flow (no canvas). These assets are kept for a possible future mannequin/canvas view. Place mannequin part images here if you re-enable that flow.

## Folders

- **`male/`** — Assets for the male avatar.
- **`female/`** — Assets for the female avatar.

## Required files in each folder

| File        | Content |
|------------|---------|
| `head.png` | Head/face region (hats, glasses, makeup, jewelry will be edited here). |
| `top.png`  | Torso/top garment region. |
| `bottom.png` | Lower body (trousers, skirt, etc.). |
| `feet.png` | Feet/shoes region. |

Replace the 1×1 placeholder PNGs with your real assets. Use neutral, minimal art so outfit choices stand out. Keep dimensions and alignment consistent between male and female so the layout stays correct.

## Usage

The outfit builder composes the full mannequin by stacking these four parts in order (bottom to top: feet → bottom → top → head) and uses the same images when the user switches gender.
