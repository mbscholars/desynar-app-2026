import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import type { OutfitSectionKey } from "@/types/outfitRecipe";
import type { LookRecipe } from "@/types/outfitRecipe";
import { OUTFIT_SECTION_KEYS, OUTFIT_SECTION_LABELS } from "@/types/outfitRecipe";
import { outfitBuilderColors } from "@/constants/outfitBuilder";
import { spacing, typography, radius } from "@/constants/theme";

function hasSelection(section: OutfitSectionKey, recipe: LookRecipe): boolean {
  const data = recipe.sections[section];
  const presets = data.presets as Record<string, string>;
  const hasPreset = Object.values(presets).some((v) => v && v !== "none" && v !== "");
  const hasPrompt = "prompt" in data && Boolean((data as { prompt?: string }).prompt?.trim());
  const hasImage = "imageRef" in data && Boolean((data as { imageRef?: string }).imageRef);
  return hasPreset || hasPrompt || hasImage;
}

interface OutfitSummaryDockProps {
  recipe: LookRecipe;
  selectedSection: OutfitSectionKey | null;
  onSelectSection: (section: OutfitSectionKey) => void;
}

export function OutfitSummaryDock({
  recipe,
  selectedSection,
  onSelectSection,
}: OutfitSummaryDockProps) {
  return (
    <View style={styles.dock}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dockScroll}
      >
        {OUTFIT_SECTION_KEYS.map((key) => {
          const selected = selectedSection === key;
          const filled = hasSelection(key, recipe);
          return (
            <Pressable
              key={key}
              onPress={() => onSelectSection(key)}
              style={[
                styles.row,
                selected && styles.rowSelected,
                filled && styles.rowFilled,
              ]}
            >
              <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]} numberOfLines={1}>
                {OUTFIT_SECTION_LABELS[key]}
              </Text>
              <Text style={styles.rowStatus}>{filled ? "✓" : "—"}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: outfitBuilderColors.surface,
    borderTopWidth: 1,
    borderTopColor: outfitBuilderColors.border,
    paddingVertical: spacing[2],
  },
  dockScroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    flexDirection: "row",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: outfitBuilderColors.surfaceElevated,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowSelected: {
    borderColor: outfitBuilderColors.accent,
  },
  rowFilled: {},
  rowLabel: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
  },
  rowLabelSelected: {
    color: outfitBuilderColors.text,
  },
  rowStatus: {
    fontSize: typography.fontSize.xs,
    color: outfitBuilderColors.textMuted,
  },
});
