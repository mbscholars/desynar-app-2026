import { colors, spacing, typography } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

type DividerProps = {
  text?: string;
  containerStyle?: ViewStyle;
  lineStyle?: ViewStyle;
  textStyle?: TextStyle;
};

export function Divider({
  text = "or",
  containerStyle,
  lineStyle,
  textStyle,
}: DividerProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={[styles.line, lineStyle]} />
      <Text style={[styles.text, textStyle]}>{text}</Text>
      <View style={[styles.line, lineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing[4],
    gap: spacing[3],
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  text: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.sans,
  },
});
