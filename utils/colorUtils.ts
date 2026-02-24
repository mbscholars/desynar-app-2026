/**
 * HSL ↔ Hex conversion for color wheel.
 */

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const match = hex.replace(/^#/, "").match(/.{2}/g);
  if (!match || match.length !== 3) return { h: 0, s: 50, l: 50 };
  let r = parseInt(match[0], 16) / 255;
  let g = parseInt(match[1], 16) / 255;
  let b = parseInt(match[2], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function isHexColor(s: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(s?.trim() ?? "");
}
