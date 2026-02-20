import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

const MIN_HEIGHT = 48;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
  /** Optional override for text color (e.g. light text on dark backgrounds). */
  textStyle?: TextStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth,
  leftIcon,
  style,
  textStyle,
}: ButtonProps) {
  const isOutline = variant === 'outline' || variant === 'ghost';
  const isGhost = variant === 'ghost';

  const bgColor = disabled
    ? colors.gray[200]
    : variant === 'primary'
      ? colors.primary[500]
      : variant === 'secondary'
        ? colors.gray[700]
        : 'transparent';

  const textColor =
    variant === 'primary' || variant === 'secondary'
      ? '#FFFFFF'
      : colors.gray[900];

  const borderColor = isOutline && !disabled ? colors.gray[300] : 'transparent';
  const borderWidth = isGhost ? 0 : 1;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.6 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {leftIcon ? <>{leftIcon}</> : null}
      <Text
        style={[
          styles.text,
          { color: disabled && !isOutline ? colors.gray[500] : textColor },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    borderRadius: radius.lg,
    gap: spacing[2],
  },
  fullWidth: { width: '100%' },
  text: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.sans,
  },
});
