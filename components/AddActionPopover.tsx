import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  animation,
  atelier,
} from "@/constants/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MIN_TAP = 44;

/** Popover bubble that appears above the add (plus) tab button with grid actions. */
export function AddActionPopover({
  visible,
  onClose,
  onUploadDesign,
  onManageMeasurements,
  onCreateWithAi,
}: {
  visible: boolean;
  onClose: () => void;
  onUploadDesign?: () => void;
  /** Replaces "Paste from socials" — opens measurement profile management. */
  onManageMeasurements?: () => void;
  onCreateWithAi?: () => void;
}) {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.95);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: animation.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: animation.normal,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.95,
          duration: animation.fast,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: animation.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  const handleUploadDesign = () => {
    onUploadDesign?.();
    onClose();
  };
  const handleManageMeasurements = () => {
    onManageMeasurements?.();
    onClose();
  };
  const handleCreateWithAi = () => {
    onCreateWithAi?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.bubbleWrap,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.bubble}>
            <View style={styles.grid}>
              <Pressable
                onPress={handleUploadDesign}
                style={({ pressed }) => [
                  styles.gridButton,
                  pressed && styles.gridButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Upload design"
              >
                <View style={styles.gridIconWrap}>
                  <FontAwesome
                    name="upload"
                    size={24}
                    color={colors.primary[900]}
                  />
                </View>
                <Text style={styles.gridLabel} numberOfLines={2}>
                  Upload design
                </Text>
              </Pressable>
              <Pressable
                onPress={handleManageMeasurements}
                style={({ pressed }) => [
                  styles.gridButton,
                  pressed && styles.gridButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Manage measurements"
              >
                <View style={styles.gridIconWrap}>
                  <FontAwesome
                    name="clipboard"
                    size={24}
                    color={colors.primary[900]}
                  />
                </View>
                <Text style={styles.gridLabel} numberOfLines={2}>
                  Manage measurements
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreateWithAi}
                style={({ pressed }) => [
                  styles.gridButton,
                  pressed && styles.gridButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create with AI"
              >
                <View style={styles.gridIconWrap}>
                  <FontAwesome
                    name="magic"
                    size={24}
                    color={colors.primary[900]}
                  />
                </View>
                <Text style={styles.gridLabel} numberOfLines={2}>
                  Create with AI
                </Text>
              </Pressable>
            </View>
          </View>
          {/* Bubble tail pointing down toward the plus button */}
          <View style={styles.tail} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const BUBBLE_TAIL_SIZE = 12;
const BUBBLE_PANEL_RADIUS = radius.panel;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 80 + BUBBLE_TAIL_SIZE,
    paddingHorizontal: spacing[6],
  },
  bubbleWrap: {
    alignSelf: "center",
    alignItems: "center",
    maxWidth: SCREEN_WIDTH - spacing[6] * 2,
  },
  bubble: {
    backgroundColor: atelier.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    borderRadius: BUBBLE_PANEL_RADIUS,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[5],
    minWidth: 260,
    ...shadows.large,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[4],
    justifyContent: "center",
  },
  gridButton: {
    width: 88,
    minHeight: MIN_TAP,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: atelier.panelBorder,
  },
  gridButtonPressed: {
    opacity: 0.85,
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[50],
    marginBottom: spacing[2],
  },
  gridLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
    textAlign: "center",
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: BUBBLE_TAIL_SIZE,
    borderRightWidth: BUBBLE_TAIL_SIZE,
    borderTopWidth: BUBBLE_TAIL_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: atelier.panel,
  },
});
