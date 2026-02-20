/**
 * Light/dark semantic colors for navigation and high-level UI.
 * Uses design tokens from theme.ts (primary, gray, etc.).
 */

import { colors } from './theme';

export default {
  light: {
    text: colors.gray[900],
    background: '#FFFFFF',
    tint: colors.primary[500],
    tabIconDefault: colors.gray[400],
    tabIconSelected: colors.primary[500],
    border: colors.gray[200],
    card: '#FFFFFF',
    primary: colors.primary[500],
    secondary: colors.secondary[500],
  },
  dark: {
    text: colors.gray[50],
    background: colors.gray[900],
    tint: colors.primary[50],
    tabIconDefault: colors.gray[600],
    tabIconSelected: colors.primary[50],
    border: colors.gray[700],
    card: colors.gray[800],
    primary: colors.primary[400],
    secondary: colors.secondary[400],
  },
};
