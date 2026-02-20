import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { atelier, colors, radius, spacing, typography } from '@/constants/theme';

const MIN_TOUCH = 44;

type InputProps = TextInputProps & {
  label?: string;
  required?: boolean;
  error?: string;
  containerStyle?: object;
  /** Use "dark" on dark/atelier backgrounds for reduced contrast. */
  variant?: 'default' | 'dark';
};

export function Input({
  label,
  required,
  error,
  containerStyle,
  variant = 'default',
  secureTextEntry,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry === true;
  const showValue = isPassword && !showPassword;
  const isDark = variant === 'dark';

  const borderColor = error
    ? colors.danger[500]
    : isFocused
      ? (isDark ? atelier.accent : colors.primary[500])
      : isDark
        ? atelier.divider
        : colors.gray[300];

  const inputWrapStyle = isDark ? styles.inputWrapDark : styles.inputWrap;
  const inputStyle = isDark ? styles.inputDark : styles.input;
  const labelStyle = isDark ? styles.labelDark : styles.label;
  const placeholderColor = isDark ? atelier.muted : colors.gray[400];
  const eyeColor = isDark ? atelier.muted : colors.gray[500];

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={labelStyle}>
          {label}
          {required ? <Text style={styles.asterisk}> *</Text> : null}
        </Text>
      ) : null}
      <View style={[inputWrapStyle, { borderColor }]}>
        <TextInput
          style={inputStyle}
          placeholderTextColor={placeholderColor}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          secureTextEntry={showValue}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={HIT_SLOP}
            style={styles.eyeWrap}
          >
            <FontAwesome
              name={showPassword ? 'eye-slash' : 'eye'}
              size={20}
              color={eyeColor}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  container: { marginBottom: spacing[4] },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginBottom: spacing[1],
    fontFamily: typography.fontFamily.sans,
  },
  labelDark: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    marginBottom: spacing[1],
    fontFamily: typography.fontFamily.sans,
  },
  asterisk: { color: colors.danger[500] },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  inputWrapDark: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    paddingVertical: spacing[3],
    fontFamily: typography.fontFamily.sans,
  },
  inputDark: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    paddingVertical: spacing[3],
    fontFamily: typography.fontFamily.sans,
  },
  eyeWrap: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.danger[500],
    marginTop: spacing[1],
    fontFamily: typography.fontFamily.sans,
  },
});
