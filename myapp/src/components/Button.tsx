import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { resolveSymbolFromLegacy, SymbolIcon } from '@/src/components/symbol-icon';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const variantColors = {
    primary: colors.primary,
    secondary: colors.surface,
    danger: colors.danger,
    warning: colors.warning,
  };
  const variantTextColors = {
    primary: '#fff',
    secondary: colors.text,
    danger: '#fff',
    warning: '#fff',
  };
  const backgroundColor = variantColors[variant];
  const textColor = variantTextColors[variant];
  const iconMeta = icon ? resolveSymbolFromLegacy(icon) : null;

  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {iconMeta && (
            <SymbolIcon
              sf={iconMeta.sf}
              fallbackName={iconMeta.fallbackName}
              size={20}
              color={textColor}
            />
          )}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: spacing.touchTarget + 4,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 16,
      borderCurve: 'continuous',
      gap: spacing.sm,
      boxShadow: colors.buttonShadow,
    },
    text: {
      fontSize: typography.body,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
