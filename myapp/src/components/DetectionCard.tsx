import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/src/components/symbol-icon';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface DetectionCardProps {
  type: 'fire' | 'smoke' | 'person' | 'animal';
  count: number;
  label: string;
}

const DETECTION_CONFIG = {
  fire: { sf: 'flame.fill', fallback: 'flame' as const, color: '#F44336' },
  smoke: { sf: 'cloud.fill', fallback: 'cloud' as const, color: '#757575' },
  person: { sf: 'person.fill', fallback: 'person' as const, color: '#2196F3' },
  animal: { sf: 'pawprint.fill', fallback: 'paw' as const, color: '#FF9800' },
};

export function DetectionCard({ type, count, label }: DetectionCardProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const config = DETECTION_CONFIG[type];

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
        <SymbolIcon sf={config.sf} fallbackName={config.fallback} size={32} color={config.color} />
      </View>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderCurve: 'continuous',
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 100,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: colors.cardShadow,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    count: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    label: {
      fontSize: typography.label,
      fontWeight: '600',
      color: colors.muted,
      textAlign: 'center',
    },
  });
}
