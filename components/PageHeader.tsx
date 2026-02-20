import { atelier, spacing, typography } from "@/constants/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

export type PageHeaderVariant = "back" | "close";

export interface PageHeaderProps {
  onBack: () => void;
  title: string;
  /** "back" = back arrow on the left (default). "close" = close (X) icon on the right. */
  variant?: PageHeaderVariant;
  /** Optional right-side action (e.g. "Add" button). When variant is "close", appears left of the close icon. */
  rightSlot?: React.ReactNode;
  /** Optional; when true shows "Back" label next to chevron. Only used when variant is "back". */
  showBackLabel?: boolean;
  style?: ViewStyle;
}

/**
 * Uniform full-screen page header: back arrow or close icon, title, optional action.
 * Matches order detail and chat screens.
 */
export function PageHeader({
  onBack,
  title,
  variant = "back",
  rightSlot,
  showBackLabel = false,
  style,
}: PageHeaderProps) {
  const isClose = variant === "close";

  return (
    <View style={[styles.header, style]}>
      {!isClose && (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <FontAwesome name="chevron-left" size={20} color={atelier.cta} />
          {showBackLabel ? <Text style={styles.backLabel}>Back</Text> : null}
        </Pressable>
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {rightSlot != null ? (
        <View style={styles.rightSlot}>{rightSlot}</View>
      ) : null}
      {isClose ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <FontAwesome name="times" size={20} color={atelier.cta} />
        </Pressable>
      ) : rightSlot == null ? (
        <View style={styles.rightSpacer} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: atelier.panelBorder,
    backgroundColor: atelier.background,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    marginRight: spacing[2],
  },
  backBtnPressed: { opacity: 0.8 },
  backLabel: {
    fontSize: typography.fontSize.sm,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  rightSlot: {
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rightSpacer: { width: 44 },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
