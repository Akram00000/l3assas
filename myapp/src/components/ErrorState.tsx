import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <SymbolIcon sf="exclamationmark.circle.fill" fallbackName="alert-circle" size={64} color={colors.danger} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && <Button title={t.refresh} onPress={onRetry} icon="refresh" variant="primary" />}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: `${colors.danger}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    message: {
      fontSize: typography.body,
      color: colors.text,
      fontWeight: '500',
      textAlign: 'center',
      maxWidth: 280,
    },
  });
}
