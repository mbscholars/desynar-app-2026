import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { OutfitSectionKey } from "@/types/outfitRecipe";
import { OUTFIT_SECTION_LABELS } from "@/types/outfitRecipe";
import { outfitBuilderColors } from "@/constants/outfitBuilder";
import { getCanvasSource } from "@/assets/canvas";
import type { CanvasGender } from "@/assets/canvas";

/** Hit areas as % of canvas height (align with mannequin part layout). */
const HOTSPOT_HEIGHTS: Record<OutfitSectionKey, { top: number; bottom: number }> = {
  head: { top: 0, bottom: 18 },
  top: { top: 18, bottom: 45 },
  bottom: { top: 45, bottom: 75 },
  shoes: { top: 75, bottom: 92 },
  background: { top: 0, bottom: 100 },
};

/** Order and height share of each part in the silhouette (must sum to 1). */
const MANNEQUIN_PARTS: { part: "head" | "top" | "bottom" | "feet"; section: OutfitSectionKey; share: number }[] = [
  { part: "head", section: "head", share: 0.18 },
  { part: "top", section: "top", share: 0.27 },
  { part: "bottom", section: "bottom", share: 0.35 },
  { part: "feet", section: "shoes", share: 0.2 },
];

interface AvatarCanvasProps {
  canvasHeight: number;
  canvasWidth: number;
  gender: CanvasGender;
  selectedSection: OutfitSectionKey | null;
  onSelectSection: (section: OutfitSectionKey) => void;
}

export function AvatarCanvas({
  canvasHeight,
  canvasWidth,
  gender,
  selectedSection,
  onSelectSection,
}: AvatarCanvasProps) {
  const centerX = canvasWidth / 2;
  const avatarWidth = Math.min(canvasWidth * 0.5, 200);
  const left = centerX - avatarWidth / 2;
  const silH = canvasHeight * 0.7;
  const silW = avatarWidth;
  const topOffset = canvasHeight * 0.05;

  return (
    <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
      {/* Background tap area - full canvas, behind avatar */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => onSelectSection("background")}
      />

      {/* Mannequin composed from canvas assets: head, top, bottom, feet */}
      <View
        style={[
          styles.avatarSilhouette,
          {
            width: silW,
            height: silH,
            left,
            top: topOffset,
          },
        ]}
        pointerEvents="none"
      >
        {MANNEQUIN_PARTS.reduce<{ top: number; nodes: React.ReactNode[] }>(
          (acc, { part, share }) => {
            const source = getCanvasSource(gender, part);
            const partHeight = silH * share;
            const partTop = acc.top;
            acc.nodes.push(
              <Image
                key={part}
                source={source}
                style={[
                  styles.partImage,
                  {
                    width: silW,
                    height: partHeight,
                    top: partTop,
                  },
                ]}
                resizeMode="contain"
              />
            );
            acc.top += partHeight;
            return acc;
          },
          { top: 0, nodes: [] }
        ).nodes}
      </View>

      {/* Overlay hotspots: only non-background */}
      {(["head", "top", "bottom", "shoes"] as const).map((key) => {
        const { top: pctTop, bottom: pctBottom } = HOTSPOT_HEIGHTS[key];
        const top = (canvasHeight * pctTop) / 100 + topOffset;
        const height = (canvasHeight * (pctBottom - pctTop)) / 100;
        const isSelected = selectedSection === key;
        return (
          <Pressable
            key={key}
            style={[
              styles.hotspot,
              {
                left,
                top,
                width: avatarWidth,
                height,
                borderColor: isSelected ? outfitBuilderColors.accent : "transparent",
                backgroundColor: isSelected ? outfitBuilderColors.accentDim : "transparent",
              },
            ]}
            onPress={() => onSelectSection(key)}
          >
            {isSelected ? (
              <View style={styles.labelWrap}>
                <Text style={styles.label}>{OUTFIT_SECTION_LABELS[key]}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: outfitBuilderColors.surface,
    position: "relative",
  },
  avatarSilhouette: {
    position: "absolute",
    backgroundColor: outfitBuilderColors.surfaceElevated,
    borderRadius: 8,
    overflow: "hidden",
  },
  partImage: {
    position: "absolute",
    left: 0,
  },
  hotspot: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 6,
  },
  labelWrap: {
    position: "absolute",
    bottom: -24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    color: outfitBuilderColors.text,
    fontFamily: "Metropolis",
  },
});
