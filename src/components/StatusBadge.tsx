import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { resolveSymbolFromLegacy, SymbolIcon } from '@/src/components/symbol-icon';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface StatusBadgeProps {
  label: string;
  status: boolean;
  icon?: string;
}

export function StatusBadge({ label, status, icon = 'ellipse' }: StatusBadgeProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const statusColor = status ? colors.online : colors.offline;
  const iconMeta = resolveSymbolFromLegacy(icon);

  return (
    <View style={styles.badge}>
      <SymbolIcon sf={iconMeta.sf} fallbackName={iconMeta.fallbackName} size={16} color={statusColor} />
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.indicator, { backgroundColor: statusColor }]} />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    label: {
      fontSize: typography.label,
      fontWeight: '600',
      color: colors.text,
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
}
