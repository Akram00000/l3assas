import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { resolveSymbolFromLegacy, SymbolIcon } from '@/src/components/symbol-icon';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: string;
  error?: string;
}

export function Input({ label, icon, error, style, ...props }: InputProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const iconMeta = icon ? resolveSymbolFromLegacy(icon) : null;
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {iconMeta && (
          <SymbolIcon
            sf={iconMeta.sf}
            fallbackName={iconMeta.fallbackName}
            size={20}
            color={colors.muted}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon, style]}
          placeholderTextColor={colors.muted}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    label: {
      fontSize: typography.label,
      fontWeight: '600',
      color: colors.text,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    inputError: {
      borderColor: colors.danger,
    },
    icon: {
      marginLeft: spacing.md,
    },
    input: {
      flex: 1,
      minHeight: spacing.touchTarget + 8,
      paddingHorizontal: spacing.md,
      fontSize: typography.body,
      color: colors.text,
    },
    inputWithIcon: {
      paddingLeft: spacing.sm,
    },
    errorText: {
      fontSize: typography.caption,
      color: colors.danger,
      marginTop: -spacing.xs,
    },
  });
}
