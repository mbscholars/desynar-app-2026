/**
 * Canvas mannequin assets by gender.
 * Each folder (male, female) must contain: head.png, top.png, bottom.png, feet.png.
 * Used by AvatarCanvas to compose the full figure.
 */

export type CanvasPart = "head" | "top" | "bottom" | "feet";
export type CanvasGender = "male" | "female";

const parts: CanvasPart[] = ["head", "top", "bottom", "feet"];

function requireSource(gender: CanvasGender, part: CanvasPart): number {
  switch (gender) {
    case "male":
      switch (part) {
        case "head":
          return require("./male/head.png");
        case "top":
          return require("./male/top.png");
        case "bottom":
          return require("./male/bottom.png");
        case "feet":
          return require("./male/feet.png");
      }
      break;
    case "female":
      switch (part) {
        case "head":
          return require("./female/head.png");
        case "top":
          return require("./female/top.png");
        case "bottom":
          return require("./female/bottom.png");
        case "feet":
          return require("./female/feet.png");
      }
      break;
  }
  throw new Error(`Unknown canvas asset: ${gender}/${part}`);
}

export function getCanvasSource(
  gender: CanvasGender,
  part: CanvasPart
): number {
  return requireSource(gender, part);
}

export const CANVAS_PARTS: CanvasPart[] = parts;
