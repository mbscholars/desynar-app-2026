/**
 * Make Your Own Outfit — Option 1 Luxury palette and preset options.
 * Background: #1C1C1E, surfaces: #232325 / #2A2A2D, text: #F5F5F5, muted: #A1A1AA, accent: #BFC3C8.
 */

export const outfitBuilderColors = {
  background: "#1C1C1E",
  surface: "#232325",
  surfaceElevated: "#2A2A2D",
  text: "#F5F5F5",
  textMuted: "#A1A1AA",
  accent: "#BFC3C8",
  accentDim: "rgba(191, 195, 200, 0.2)",
  primaryButtonBg: "#F5F5F5",
  primaryButtonText: "#1C1C1E",
  border: "rgba(255,255,255,0.1)",
} as const;

/** Model / body type and complexion presets */
export const MODEL_PRESETS = {
  type: ["Slim", "Regular", "Athletic", "Plus", "Petite", "Tall"],
  complexion: ["Light", "Medium", "Tan", "Brown", "Dark"],
} as const;

/** Head presets by category */
export const HEAD_PRESETS = {
  hat: ["Fedora", "Beret", "Cap", "Headwrap", "No hat"],
  glasses: ["Round frames", "Square frames", "Aviators", "No glasses"],
  makeup: ["Natural", "Soft glam", "Bold lips", "No makeup"],
  jewelry: ["Gold hoops", "Studs", "Neck chain", "None"],
} as const;

/** Shared garment color palette (name + hex) for top, bottom, and shoes. */
export const GARMENT_COLORS = [
  { name: "black", hex: "#1C1C1E" },
  { name: "white", hex: "#F5F5F5" },
  { name: "navy", hex: "#1e3a5f" },
  { name: "grey", hex: "#6b7280" },
  { name: "beige", hex: "#d4c4a8" },
  { name: "brown", hex: "#78350f" },
  { name: "tan", hex: "#c4a574" },
  { name: "red", hex: "#b91c1c" },
  { name: "burgundy", hex: "#722f37" },
  { name: "pink", hex: "#be185d" },
  { name: "orange", hex: "#c2410c" },
  { name: "yellow", hex: "#ca8a04" },
  { name: "green", hex: "#166534" },
  { name: "blue", hex: "#1d4ed8" },
  { name: "lavender", hex: "#7c3aed" },
  { name: "cream", hex: "#fef3c7" },
] as const;

/** Top presets */
export const TOP_PRESETS = {
  type: [
    "T-shirt",
    "Shirt",
    "Blouse",
    "Hoodie",
    "Corset",
    "Agbada top",
    "Senator top",
  ],
  fit: ["Slim", "Regular", "Oversized"],
  fabric: ["Cotton", "Silk", "Linen", "Ankara", "Wool"],
  sleeve: ["Sleeveless", "Short", "Long", "Puff"],
} as const;

/** Bottom presets */
export const BOTTOM_PRESETS = {
  type: ["Trousers", "Jeans", "Skirt", "Shorts", "Wrapper", "Cargo"],
  fit: ["Straight", "Skinny", "Wide-leg", "Flared"],
  waist: ["High", "Mid", "Low"],
  fabric: ["Cotton", "Denim", "Linen", "Ankara"],
} as const;

/** Shoes: grid cards then sub-options */
export const SHOES_TYPES = [
  "Loafers",
  "Sneakers",
  "Heels",
  "Sandals",
  "Boots",
  "Oxfords",
] as const;

export const SHOES_PRESETS = {
  color: ["Black", "White", "Brown", "Tan", "Custom"],
  material: ["Leather", "Suede", "Fabric"],
  detail: ["Minimal", "Buckle", "Laces", "Glossy"],
} as const;

/** Background presets */
export const BACKGROUND_PRESETS = {
  scene: [
    "Studio white",
    "Luxury boutique",
    "Modern apartment",
    "Garden",
    "City night",
    "Wedding hall",
  ],
  lighting: ["Soft daylight", "Golden hour", "Moody", "Bright studio"],
  tone: ["Neutral", "Warm", "Cool"],
} as const;
