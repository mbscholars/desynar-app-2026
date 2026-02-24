import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { OutfitSectionKey } from "@/types/outfitRecipe";
import type { LookRecipe } from "@/types/outfitRecipe";
import { OUTFIT_SECTION_LABELS } from "@/types/outfitRecipe";
import { outfitBuilderColors } from "@/constants/outfitBuilder";
import { spacing, typography, radius } from "@/constants/theme";

function sectionSummary(section: OutfitSectionKey, recipe: LookRecipe): string | null {
  const data = recipe.sections[section];
  const presets = data.presets as Record<string, string>;
  const parts: string[] = [];
  if (section === "model") {
    parts.push(recipe.gender.charAt(0).toUpperCase() + recipe.gender.slice(1));
  }
  Object.entries(presets).forEach(([_, v]) => {
    if (v && v !== "none" && v !== "") parts.push(String(v));
  });
  if ("prompt" in data && (data as { prompt?: string }).prompt?.trim()) {
    parts.push("Custom");
  }
  if ("imageRef" in data && (data as { imageRef?: string }).imageRef) {
    parts.push("Image");
  }
  if (parts.length === 0) return null;
  return parts.slice(0, 4).join(", ");
}

interface OutfitContainerCardProps {
  section: OutfitSectionKey;
  recipe: LookRecipe;
  onPress: () => void;
  /** Override display label (e.g. "Accessories" for head). */
  label?: string;
}

export function OutfitContainerCard({
  section,
  recipe,
  onPress,
  label: labelOverride,
}: OutfitContainerCardProps) {
  const label = labelOverride ?? OUTFIT_SECTION_LABELS[section];
  const summary = sectionSummary(section, recipe);
  const filled = summary != null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        filled && styles.cardFilled,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardInner}>
        <Text style={styles.label}>{label}</Text>
        {summary ? (
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
        ) : (
          <Text style={styles.placeholder}>Tap to add</Text>
        )}
        <FontAwesome
          name="chevron-right"
          size={14}
          color={outfitBuilderColors.textMuted}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: outfitBuilderColors.surfaceElevated,
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
    borderRadius: radius.lg,
    marginBottom: spacing[3],
  },
  cardFilled: {
    borderColor: outfitBuilderColors.accentDim,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  label: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.text,
    minWidth: 88,
  },
  summary: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
    marginLeft: spacing[2],
  },
  placeholder: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
    fontStyle: "italic",
    marginLeft: spacing[2],
  },
  chevron: {
    marginLeft: spacing[2],
  },
});
