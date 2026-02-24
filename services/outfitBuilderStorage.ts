import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LookRecipe } from "@/types/outfitRecipe";
import { createDefaultLookRecipe } from "@/types/outfitRecipe";

const OUTFIT_DRAFT_KEY = "outfit_builder_draft";
const OUTFIT_DRAFT_ID_KEY = "outfit_builder_draft_id";
const OUTFIT_VISIBLE_OPTIONALS_KEY = "outfit_builder_visible_optionals";

/** Ensure loaded recipe has model section and new model fields (migrate old drafts). */
function ensureModelSection(recipe: LookRecipe): LookRecipe {
  const defaults = createDefaultLookRecipe(recipe.gender);
  const existing = recipe.sections.model;
  if (!existing) {
    return {
      ...recipe,
      sections: { ...recipe.sections, model: defaults.sections.model },
    };
  }
  const model = {
    ...existing,
    imageRef: "imageRef" in existing && existing.imageRef != null ? existing.imageRef : null,
    presets: {
      ...existing.presets,
      complexion: existing.presets.complexion ?? defaults.sections.model.presets.complexion,
    },
  };
  return { ...recipe, sections: { ...recipe.sections, model } };
}

/** Ensure shoes section has imageRef (migrate old drafts). */
function ensureShoesSection(recipe: LookRecipe): LookRecipe {
  const shoes = recipe.sections.shoes;
  if (!shoes) return recipe;
  if ("imageRef" in shoes) return recipe;
  return {
    ...recipe,
    sections: {
      ...recipe.sections,
      shoes: { ...shoes, imageRef: null },
    },
  };
}

/** Optional sections that can be added via plus (background, accessories/head). */
export type VisibleOptionalSection = "background" | "head";

export async function loadVisibleOptionals(): Promise<VisibleOptionalSection[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTFIT_VISIBLE_OPTIONALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((s) => s === "background" || s === "head"))
      return parsed as VisibleOptionalSection[];
    return [];
  } catch {
    return [];
  }
}

export async function saveVisibleOptionals(optionals: VisibleOptionalSection[]): Promise<void> {
  await AsyncStorage.setItem(OUTFIT_VISIBLE_OPTIONALS_KEY, JSON.stringify(optionals));
}

export async function loadOutfitDraft(): Promise<LookRecipe | null> {
  try {
    const raw = await AsyncStorage.getItem(OUTFIT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LookRecipe;
    if (parsed?.gender && parsed?.sections) {
      return ensureShoesSection(ensureModelSection(parsed));
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveOutfitDraftLocal(recipe: LookRecipe): Promise<void> {
  await AsyncStorage.setItem(OUTFIT_DRAFT_KEY, JSON.stringify(recipe));
}

export async function clearOutfitDraft(): Promise<void> {
  await AsyncStorage.multiRemove([
    OUTFIT_DRAFT_KEY,
    OUTFIT_DRAFT_ID_KEY,
    OUTFIT_VISIBLE_OPTIONALS_KEY,
  ]);
}

export async function getOutfitDraftId(): Promise<string | null> {
  return AsyncStorage.getItem(OUTFIT_DRAFT_ID_KEY);
}

export async function setOutfitDraftId(id: string): Promise<void> {
  await AsyncStorage.setItem(OUTFIT_DRAFT_ID_KEY, id);
}

/** Returns either loaded draft or default recipe. */
export async function loadOrCreateDraft(): Promise<LookRecipe> {
  const loaded = await loadOutfitDraft();
  const recipe = loaded ?? createDefaultLookRecipe("female");
  return ensureShoesSection(ensureModelSection(recipe));
}
