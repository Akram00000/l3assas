import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function SliderInput({ label, value, min, max, step, unit = '', onChange }: SliderInputProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{value}</Text>
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </View>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        style={styles.slider}
      />
      <View style={styles.range}>
        <Text style={styles.rangeText}>{min}</Text>
        <Text style={styles.rangeText}>{max}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.text,
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 8,
    },
    value: {
      fontSize: typography.body,
      fontWeight: '700',
      color: '#fff',
    },
    unit: {
      fontSize: typography.caption,
      fontWeight: '600',
      color: '#fff',
      opacity: 0.9,
    },
    slider: {
      height: 40,
    },
    range: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rangeText: {
      fontSize: typography.caption,
      color: colors.muted,
      fontWeight: '500',
    },
  });
}
