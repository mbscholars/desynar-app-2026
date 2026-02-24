/**
 * Look recipe for "Make Your Own Outfit" (Avatar Builder).
 * Persisted as draft and sent to backend on Generate.
 */

export type OutfitGender = "male" | "female";

export type HeadPresets = {
  hat?: string;
  glasses?: string;
  makeup?: string;
  jewelry?: string;
};

export type TopPresets = {
  type?: string;
  fit?: string;
  fabric?: string;
  sleeve?: string;
  color?: string;
};

export type BottomPresets = {
  type?: string;
  fit?: string;
  waist?: string;
  fabric?: string;
  color?: string;
};

export type ShoesPresets = {
  type?: string;
  color?: string;
  material?: string;
  detail?: string;
};

export type BackgroundPresets = {
  scene?: string;
  lighting?: string;
  tone?: string;
};

export type ModelPresets = {
  type?: string;
  complexion?: string;
};

export type ModelSection = {
  presets: ModelPresets;
  prompt: string;
  imageRef: string | null;
  /** Optional measurement profile ID for try-on. */
  measurementProfileId?: string | null;
};

export type HeadSection = {
  presets: HeadPresets;
  prompt: string;
  imageRef: string | null;
};

export type TopSection = {
  presets: TopPresets;
  prompt: string;
  imageRef: string | null;
  imageMode?: "style_only" | "full";
};

export type BottomSection = {
  presets: BottomPresets;
  prompt: string;
  imageRef: string | null;
};

export type ShoesSection = {
  presets: ShoesPresets;
  prompt: string;
  imageRef: string | null;
};

export type BackgroundSection = {
  presets: BackgroundPresets;
  prompt: string;
  blur: number;
  neutralBackground: boolean;
};

export type OutfitSections = {
  model: ModelSection;
  head: HeadSection;
  top: TopSection;
  bottom: BottomSection;
  shoes: ShoesSection;
  background: BackgroundSection;
};

export interface LookRecipe {
  gender: OutfitGender;
  sections: OutfitSections;
}

/** Section key for hotspot and editor. */
export type OutfitSectionKey = keyof OutfitSections;

export const OUTFIT_SECTION_KEYS: OutfitSectionKey[] = [
  "model",
  "head",
  "top",
  "bottom",
  "shoes",
  "background",
];

export const OUTFIT_SECTION_LABELS: Record<OutfitSectionKey, string> = {
  model: "Model",
  head: "Head",
  top: "Top",
  bottom: "Bottom",
  shoes: "Shoes",
  background: "Background",
};

function defaultModel(): ModelSection {
  return {
    presets: { type: "regular", complexion: "medium" },
    prompt: "",
    imageRef: null,
    measurementProfileId: null,
  };
}

function defaultHead(): HeadSection {
  return {
    presets: { hat: "none", glasses: "none", makeup: "natural", jewelry: "none" },
    prompt: "",
    imageRef: null,
  };
}

function defaultTop(): TopSection {
  return {
    presets: { type: "", fit: "regular", fabric: "cotton", sleeve: "long", color: "" },
    prompt: "",
    imageRef: null,
    imageMode: "style_only",
  };
}

function defaultBottom(): BottomSection {
  return {
    presets: { type: "", fit: "regular", waist: "mid", fabric: "cotton", color: "" },
    prompt: "",
    imageRef: null,
  };
}

function defaultShoes(): ShoesSection {
  return {
    presets: { type: "", color: "black", material: "leather", detail: "minimal" },
    prompt: "",
    imageRef: null,
  };
}

function defaultBackground(): BackgroundSection {
  return {
    presets: {
      scene: "studio white",
      lighting: "soft daylight",
      tone: "neutral",
    },
    prompt: "",
    blur: 40,
    neutralBackground: true,
  };
}

export function createDefaultLookRecipe(gender: OutfitGender = "female"): LookRecipe {
  return {
    gender,
    sections: {
      model: defaultModel(),
      head: defaultHead(),
      top: defaultTop(),
      bottom: defaultBottom(),
      shoes: defaultShoes(),
      background: defaultBackground(),
    },
  };
}
