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
import { colors, radius, spacing, typography } from '@/constants/theme';

const MIN_TOUCH = 44;

type InputProps = TextInputProps & {
  label?: string;
  required?: boolean;
  error?: string;
  containerStyle?: object;
};

export function Input({
  label,
  required,
  error,
  containerStyle,
  secureTextEntry,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry === true;
  const showValue = isPassword && !showPassword;

  const borderColor = error
    ? colors.danger[500]
    : isFocused
      ? colors.primary[500]
      : colors.gray[300];

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.asterisk}> *</Text> : null}
        </Text>
      ) : null}
      <View style={[styles.inputWrap, { borderColor }]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.gray[400]}
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
              color={colors.gray[500]}
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
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
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
