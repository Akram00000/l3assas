import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={[styles.card, style]}>
      {children}
    </Animated.View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderCurve: 'continuous',
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: colors.cardShadow,
    },
  });
}
