import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PredictRequest } from '@/src/api/types';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { LoadingState } from '@/src/components/LoadingState';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { usePredictPoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { getAlertColor, getSpreadColor } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { localizeAlertValue, localizeGasClassValue, localizeSpreadLevelValue } from '@/src/utils/valueLabels';

const SERVER_API_PAYLOAD: PredictRequest = {
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
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const result = usePredictPoll(SERVER_API_PAYLOAD, true);

  const fixedInputs = [
    { label: t.mq2, value: SERVER_API_PAYLOAD.mq2 },
    { label: t.mq6, value: SERVER_API_PAYLOAD.mq6 },
    { label: t.temperature, value: `${SERVER_API_PAYLOAD.temperature}°C` },
    { label: t.humidity, value: `${SERVER_API_PAYLOAD.rh}%` },
    { label: t.wind, value: SERVER_API_PAYLOAD.wind },
    { label: t.rain, value: `${SERVER_API_PAYLOAD.rain} mm` },
    { label: t.month, value: SERVER_API_PAYLOAD.month_num },
  ];

  return (
    <TabSwipeGesture currentPath="/(tabs)/sensors">
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}>
        {/* Fixed Sensor Inputs (server API payload) */}
        <Card>
          <View style={styles.cardHeader}>
            <SymbolIcon sf="slider.horizontal.3" fallbackName="options" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t.sensors}</Text>
          </View>
          <View style={styles.fixedInputsContainer}>
            {fixedInputs.map((item) => (
              <View key={String(item.label)} style={styles.fixedInputRow}>
                <Text style={styles.fixedInputLabel}>{item.label}</Text>
                <Text style={styles.fixedInputValue}>{item.value}</Text>
              </View>
            ))}
          </View>
          <Button
            title={t.retry}
            onPress={() => {
              void result.refetch();
            }}
            icon="send"
            variant="primary"
            loading={result.isFetching}
          />
        </Card>

        {/* Results */}
        {result.data && (
          <>
            <Card>
              <View style={styles.cardHeader}>
                <SymbolIcon sf="chart.bar.xaxis" fallbackName="stats-chart" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t.results}</Text>
              </View>
              <View style={styles.resultsGrid}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.alert}</Text>
                  <Text selectable style={[styles.resultValue, { color: getAlertColor(result.data.alert, colors) }]}> 
                    {localizeAlertValue(result.data.alert, t)}
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.smokeProb}</Text>
                  <Text selectable style={styles.resultValue}>{Math.round(result.data.smoke_prob * 100)}%</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.fireRisk}</Text>
                  <Text selectable style={styles.resultValue}>{Math.round(result.data.fire_risk_prob * 100)}%</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.gasClass}</Text>
                  <Text selectable style={styles.resultValue}>{localizeGasClassValue(result.data.gas_class, t)}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>{t.confidence}</Text>
                  <Text selectable style={styles.resultValue}>{Math.round(result.data.confidence * 100)}%</Text>
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
                        <Text selectable style={styles.probabilityValue}>{Math.round((value ?? 0) * 100)}%</Text>
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
                      <SymbolIcon
                        sf="checkmark.circle.fill"
                        fallbackName="checkmark-circle"
                        size={16}
                        color={colors.primary}
                      />
                      <Text selectable style={styles.gateText}>{gate.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Spread Speed */}
            <Card>
              <View style={styles.cardHeader}>
                <SymbolIcon sf="flame.fill" fallbackName="flame" size={24} color={colors.warning} />
                <Text style={styles.sectionTitle}>{t.spreadSpeed}</Text>
              </View>
              <View style={styles.spreadHeader}>
                <View style={styles.spreadMain}>
                  <Text style={styles.spreadLabel}>{t.spreadLevel}</Text>
                  <Text selectable style={[styles.spreadLevel, { color: getSpreadColor(result.data.spread_speed.level) }]}> 
                    {localizeSpreadLevelValue(result.data.spread_speed.level, t)}
                  </Text>
                </View>
                <View style={styles.spreadMain}>
                  <Text style={styles.spreadLabel}>{t.speed}</Text>
                  <Text selectable style={styles.spreadValue}>
                    {result.data.spread_speed.speed_m_per_min.toFixed(1)} m/min
                  </Text>
                  {result.data.spread_speed.speed_km_per_h && (
                    <Text selectable style={styles.spreadSubvalue}>
                      {result.data.spread_speed.speed_km_per_h.toFixed(2)} km/h
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </>
        )}

        {result.isLoading && <LoadingState message={t.loading} />}
      </ScrollView>
    </View>
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
    fixedInputsContainer: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    fixedInputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    fixedInputLabel: {
      fontSize: typography.body,
      color: colors.muted,
      fontWeight: '600',
    },
    fixedInputValue: {
      fontSize: typography.body,
      color: colors.text,
      fontWeight: '700',
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
      fontVariant: ['tabular-nums'],
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
      fontVariant: ['tabular-nums'],
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
      fontVariant: ['tabular-nums'],
    },
    spreadSubvalue: {
      fontSize: typography.label,
      color: colors.muted,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
    },
  });
}
