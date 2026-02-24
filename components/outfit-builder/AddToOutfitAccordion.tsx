import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { outfitBuilderColors } from "@/constants/outfitBuilder";
import { spacing, typography, radius } from "@/constants/theme";
import type { VisibleOptionalSection } from "@/services/outfitBuilderStorage";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const OPTIONAL_ITEMS: Record<
  VisibleOptionalSection,
  { label: string; description: string }
> = {
  background: {
    label: "Background",
    description: "Set the scene: studio, boutique, outdoor, or custom lighting.",
  },
  head: {
    label: "Accessories",
    description: "Hats, glasses, makeup, and jewelry to complete the look.",
  },
};

interface AddToOutfitAccordionProps {
  visible: boolean;
  onClose: () => void;
  availableOptions: VisibleOptionalSection[];
  onAdd: (option: VisibleOptionalSection) => void;
}

export function AddToOutfitAccordion({
  visible,
  onClose,
  availableOptions,
  onAdd,
}: AddToOutfitAccordionProps) {
  const [expandedId, setExpandedId] = useState<VisibleOptionalSection | null>(null);

  const toggle = (id: VisibleOptionalSection) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAdd = (option: VisibleOptionalSection) => {
    onAdd(option);
    onClose();
    setExpandedId(null);
  };

  if (availableOptions.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.accordionWrap} pointerEvents="box-none">
          <Pressable
            style={styles.accordionPanel}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Add to outfit</Text>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <FontAwesome name="times" size={20} color={outfitBuilderColors.text} />
              </Pressable>
            </View>
            <View style={styles.list}>
              {availableOptions.map((key) => {
                const { label, description } = OPTIONAL_ITEMS[key];
                const isExpanded = expandedId === key;
                return (
                  <View key={key} style={styles.accordionItem}>
                    <Pressable
                      onPress={() => toggle(key)}
                      style={[
                        styles.accordionHeader,
                        isExpanded && styles.accordionHeaderExpanded,
                      ]}
                    >
                      <Text style={styles.accordionLabel}>{label}</Text>
                      <FontAwesome
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={outfitBuilderColors.textMuted}
                      />
                    </Pressable>
                    {isExpanded && (
                      <View style={styles.accordionBody}>
                        <Text style={styles.accordionDescription}>
                          {description}
                        </Text>
                        <Pressable
                          onPress={() => handleAdd(key)}
                          style={styles.addButton}
                        >
                          <FontAwesome name="plus" size={14} color={outfitBuilderColors.primaryButtonText} />
                          <Text style={styles.addButtonText}>Add {label}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },
  accordionWrap: {
    width: "100%",
    maxWidth: 400,
  },
  accordionPanel: {
    backgroundColor: outfitBuilderColors.surface,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: outfitBuilderColors.border,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.text,
  },
  closeBtn: {
    padding: spacing[2],
  },
  list: {
    padding: spacing[2],
  },
  accordionItem: {
    marginBottom: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: outfitBuilderColors.surfaceElevated,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  accordionHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: outfitBuilderColors.border,
  },
  accordionLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.text,
  },
  accordionBody: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  accordionDescription: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[3],
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: outfitBuilderColors.primaryButtonBg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    alignSelf: "flex-start",
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.primaryButtonText,
  },
});
