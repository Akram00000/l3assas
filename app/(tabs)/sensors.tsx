import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PredictRequest } from '@/src/api/types';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { LoadingState } from '@/src/components/LoadingState';
import { SliderInput } from '@/src/components/SliderInput';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { usePredictPoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { getSpreadColor } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { localizeAlertValue, localizeGasClassValue, localizeSpreadLevelValue } from '@/src/utils/valueLabels';

const DEFAULT_VALUES: PredictRequest = {
  mq2: 100,
  mq6: 80,
  temperature: 20,
  rh: 60,
  wind: 5,
  rain: 0,
  month_num: 7,
};

export default function SensorsScreen() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [values, setValues] = useState<PredictRequest>(DEFAULT_VALUES);
  const [enabled, setEnabled] = useState(false);
  const result = usePredictPoll(values, enabled);

  const setValue = <K extends keyof PredictRequest>(key: K, next: PredictRequest[K]) =>
    setValues((prev) => ({ ...prev, [key]: next }));

  return (
    <TabSwipeGesture currentPath="/(tabs)/sensors">
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Sensor Inputs */}
        <Card>
          <View style={styles.cardHeader}>
            <Ionicons name="options" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t.sensors}</Text>
          </View>
          <View style={styles.inputsContainer}>
            <SliderInput label={t.mq2} value={values.mq2} min={0} max={1023} step={1} onChange={(v) => setValue('mq2', v)} />
            <SliderInput label={t.mq6} value={values.mq6} min={0} max={1023} step={1} onChange={(v) => setValue('mq6', v)} />
            <SliderInput label={t.temperature} value={values.temperature} min={-10} max={50} step={1} unit="°C" onChange={(v) => setValue('temperature', v)} />
            <SliderInput label={t.humidity} value={values.rh} min={0} max={100} step={1} unit="%" onChange={(v) => setValue('rh', v)} />
            <SliderInput label={t.wind} value={values.wind} min={0} max={80} step={1} onChange={(v) => setValue('wind', v)} />
            <SliderInput label={t.rain} value={values.rain} min={0} max={50} step={0.5} unit="mm" onChange={(v) => setValue('rain', v)} />
            <SliderInput label={t.month} value={values.month_num} min={1} max={12} step={1} onChange={(v) => setValue('month_num', v)} />
          </View>
          <Button
            title={t.submit}
            onPress={() => setEnabled(true)}
            icon="send"
            variant="primary"
            loading={result.isLoading}
          />
        </Card>

        {/* Results */}
        {result.data && (
          <>
            <Card>
              <View style={styles.cardHeader}>
                <Ionicons name="analytics" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t.results}</Text>
              </View>
              <View style={styles.resultsGrid}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.alert}</Text>
                  <Text style={[styles.resultValue, { color: colors.danger }]}>
                    {localizeAlertValue(result.data.alert, t)}
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.smokeProb}</Text>
                  <Text style={styles.resultValue}>{Math.round(result.data.smoke_prob * 100)}%</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.fireRisk}</Text>
                  <Text style={styles.resultValue}>{Math.round(result.data.fire_risk_prob * 100)}%</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.gasClass}</Text>
                  <Text style={styles.resultValue}>{localizeGasClassValue(result.data.gas_class, t)}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.confidence}</Text>
                  <Text style={styles.resultValue}>{Math.round(result.data.confidence * 100)}%</Text>
                </View>
              </View>

              {/* Class Probabilities */}
              {result.data.class_proba && Object.keys(result.data.class_proba).length > 0 && (
                <View style={styles.probabilities}>
                  <Text style={styles.subsectionTitle}>{t.classProbabilities}</Text>
                  <View style={styles.probabilitiesGrid}>
                    {Object.entries(result.data.class_proba).map(([key, value]) => (
                      <View key={key} style={styles.probabilityItem}>
                        <Text style={styles.probabilityLabel}>{localizeGasClassValue(key, t)}</Text>
                        <Text style={styles.probabilityValue}>{Math.round((value ?? 0) * 100)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Gates Applied */}
              {result.data.gates_applied && result.data.gates_applied.length > 0 && (
                <View style={styles.gates}>
                  <Text style={styles.subsectionTitle}>{t.gatesApplied}</Text>
                  {result.data.gates_applied.map((gate, idx) => (
                    <View key={idx} style={styles.gateItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={styles.gateText}>{gate.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Spread Speed */}
            <Card>
              <View style={styles.cardHeader}>
                <Ionicons name="flame" size={24} color={colors.warning} />
                <Text style={styles.sectionTitle}>{t.spreadSpeed}</Text>
              </View>
              <View style={styles.spreadHeader}>
                <View style={styles.spreadMain}>
                  <Text style={styles.spreadLabel}>{t.spreadLevel}</Text>
                  <Text style={[styles.spreadLevel, { color: getSpreadColor(result.data.spread_speed.level) }]}>
                    {localizeSpreadLevelValue(result.data.spread_speed.level, t)}
                  </Text>
                </View>
                <View style={styles.spreadMain}>
                  <Text style={styles.spreadLabel}>{t.speed}</Text>
                  <Text style={styles.spreadValue}>
                    {result.data.spread_speed.speed_m_per_min.toFixed(1)} m/min
                  </Text>
                  {result.data.spread_speed.speed_km_per_h && (
                    <Text style={styles.spreadSubvalue}>
                      {result.data.spread_speed.speed_km_per_h.toFixed(2)} km/h
                    </Text>
                  )}
                </View>
              </View>

              {/* Factors */}
              <View style={styles.factors}>
                <Text style={styles.subsectionTitle}>{t.factors}</Text>
                <View style={styles.factorsGrid}>
                  {Object.entries(result.data.spread_speed.factors).map(([key, value]) => (
                    <View key={key} style={styles.factorItem}>
                      <Text style={styles.factorLabel}>{key}</Text>
                      <Text style={styles.factorValue}>{value.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          </>
        )}

        {result.isLoading && <LoadingState message={t.loading} />}
      </ScrollView>
    </SafeAreaView>
    </TabSwipeGesture>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    sectionTitle: {
      fontSize: typography.heading,
      fontWeight: '700',
      color: colors.text,
    },
    subsectionTitle: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    inputsContainer: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    resultsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    resultItem: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      gap: spacing.xs,
    },
    resultLabel: {
      fontSize: typography.label,
      color: colors.muted,
      fontWeight: '600',
    },
    resultValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    probabilities: {
      marginTop: spacing.md,
    },
    probabilitiesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    probabilityItem: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    probabilityLabel: {
      fontSize: typography.label,
      fontWeight: '600',
      color: colors.text,
    },
    probabilityValue: {
      fontSize: typography.label,
      fontWeight: '700',
      color: colors.primary,
    },
    gates: {
      marginTop: spacing.md,
    },
    gateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    gateText: {
      fontSize: typography.body,
      color: colors.text,
      fontWeight: '500',
    },
    spreadHeader: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    spreadMain: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      gap: spacing.xs,
    },
    spreadLabel: {
      fontSize: typography.label,
      color: colors.muted,
      fontWeight: '600',
    },
    spreadLevel: {
      fontSize: 28,
      fontWeight: '700',
    },
    spreadValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    spreadSubvalue: {
      fontSize: typography.label,
      color: colors.muted,
      fontWeight: '500',
    },
    factors: {
      marginTop: spacing.md,
    },
    factorsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    factorItem: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    factorLabel: {
      fontSize: typography.caption,
      fontWeight: '600',
      color: colors.muted,
    },
    factorValue: {
      fontSize: typography.label,
      fontWeight: '700',
      color: colors.text,
    },
  });
}
