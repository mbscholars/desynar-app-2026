/**
 * Desynar design tokens — single source of truth for mobile.
 * Mapped from mobile-app/colors.md (Tailwind theme.extend).
 * Use these tokens only; do not hardcode hex/rgb in components.
 */

export type PaletteStep =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;

export type ColorPalette = Record<PaletteStep, string>;

function palette(
  step50: string,
  step500: string,
  step900: string,
): ColorPalette {
  return {
    50: step50,
    100: step50,
    200: step50,
    300: step500,
    400: step500,
    500: step500,
    600: step500,
    700: step900,
    800: step900,
    900: step900,
  };
}

/**
 * Color palettes (50 = lightest, 900 = darkest).
 * Values from tailwind.config.js / colors.md.
 */
export const colors = {
  primary: palette("#CEF0BD", "#293225", "#000000"),
  secondary: palette("#DCD5E0", "#2A222F", "#050305"),
  gray: palette("#E2E7E2", "#2E302E", "#040404"),
  danger: palette("#FDECEC", "#701011", "#130102"),
  warning: palette("#FFD0B4", "#3B2001", "#0B0400"),
  success: palette("#C0FFD9", "#034E2E", "#00110A"),
  info: palette("#E4E8FC", "#153067", "#030716"),
} as const;

/**
 * Atelier / luxury login — dark fashion-grade palette.
 * Use for cinematic login and premium surfaces.
 */
export const atelier = {
  background: "#0E0E0E",
  /** Semi-transparent dark overlay so blurred background shows through. */
  backgroundOverlay: "rgba(14,14,14,0.72)",
  panel: "rgba(22,22,22,0.75)",
  panelBorder: "rgba(255,255,255,0.08)",
  panelGlow: "rgba(255,255,255,0.04)",
  accent: "#C7BFAE",
  cta: "#F5F5F5",
  ctaText: "#0E0E0E",
  /** Header text/icon color for use on white or light backgrounds. */
  headerTextOnLight: "rgba(0, 0, 0, 0.87)",
  muted: "rgba(255, 255, 255, 0.5)",
  divider: "rgba(255,255,255,0.12)",
} as const;

/**
 * Spacing scale (pt). Reuse Tailwind scale + custom 18, 88, 128.
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  18: 72, // 4.5rem
  20: 80,
  24: 96,
  88: 352, // 22rem
  128: 512, // 32rem
} as const;

/**
 * Border radius. Use theme tokens only.
 */
export const radius = {
  none: 0,
  sm: 2,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  /** Panel / surface (20–28px per design). */
  panel: 24,
  full: 9999,
} as const;

/**
 * Shadows — map to React Native shadow props (iOS) and elevation (Android).
 * shadow-soft / shadow-medium / shadow-large from Tailwind.
 */
export const shadows = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

/**
 * Typography — Metropolis per docs/MetropolisFont.md (assets/fonts/metropolis).
 * Weights loaded in app/_layout; use these families for consistent rendering (Android).
 */
export const typography = {
  fontFamily: {
    sans: "Metropolis",
    light: "MetropolisLight",
    medium: "MetropolisMedium",
    semibold: "MetropolisSemiBold",
    bold: "MetropolisBold",
    extraBold: "MetropolisExtraBold",
    sansFallback: "System",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
  },
  fontWeight: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;

/**
 * Animation durations (ms). 150–200 ms micro; 300 ms overlays.
 */
export const animation = {
  fast: 150,
  normal: 200,
  overlay: 300,
} as const;

export const theme = {
  colors,
  atelier,
  spacing,
  radius,
  shadows,
  typography,
  animation,
} as const;

export default theme;
