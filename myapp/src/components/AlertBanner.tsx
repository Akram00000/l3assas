import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AlertLevel } from '@/src/api/types';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { useLanguage } from '@/src/i18n';
import { getAlertColor, type AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { localizeAlertValue } from '@/src/utils/valueLabels';

interface AlertBannerProps {
  alert: AlertLevel;
  message: string;
}

export function AlertBanner({ alert, message }: AlertBannerProps) {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const backgroundColor = getAlertColor(alert, colors);
  const icon =
    alert === 'FIRE'
      ? { sf: 'flame.fill', fallback: 'flame' as const }
      : alert === 'WARNING'
        ? { sf: 'exclamationmark.triangle.fill', fallback: 'warning' as const }
        : { sf: 'checkmark.circle.fill', fallback: 'checkmark-circle' as const };

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <SymbolIcon sf={icon.sf} fallbackName={icon.fallback} size={28} color="#fff" />
      <View style={styles.textContainer}>
        <Text style={styles.alertText}>{localizeAlertValue(alert, t)}</Text>
        <Text style={styles.messageText}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 18,
      borderCurve: 'continuous',
      gap: spacing.md,
      minHeight: spacing.touchTarget + spacing.md,
      boxShadow: colors.buttonShadow,
    },
    textContainer: {
      flex: 1,
    },
    alertText: {
      color: '#fff',
      fontSize: typography.alert,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    messageText: {
      color: '#fff',
      fontSize: typography.body,
      fontWeight: '500',
      opacity: 0.95,
      marginTop: 2,
    },
  });
}
