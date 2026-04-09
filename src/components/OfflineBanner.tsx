import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/src/components/symbol-icon';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface OfflineBannerProps {
  message: string;
}

export function OfflineBanner({ message }: OfflineBannerProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.banner}>
      <SymbolIcon sf="wifi.slash" fallbackName="cloud-offline" size={20} color="#fff" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.offline,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    text: {
      flex: 1,
      fontSize: typography.label,
      fontWeight: '600',
      color: '#fff',
    },
  });
}
