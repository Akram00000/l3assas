import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    message: {
      fontSize: typography.body,
      color: colors.muted,
      fontWeight: '500',
    },
  });
}
