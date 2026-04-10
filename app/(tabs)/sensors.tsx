import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';

import { api } from '@/src/api/endpoints';
import { Card } from '@/src/components/Card';
import { LoadingState } from '@/src/components/LoadingState';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { usePredictPoll, useSensorStatePoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { getAlertColor, getSpreadColor } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { localizeAlertValue, localizeGasClassValue, localizeSpreadLevelValue } from '@/src/utils/valueLabels';

const FALLBACK_SENSOR_STATE = {
  mq2: 100,
  mq6: 80,
  temperature: 20,
  rh: 60,
  wind: 5,
  rain: 0,
  month_num: 7,
};

function buildHistory(currentValue: number, variation: number) {
  return [...Array(10)].map((_, idx) => {
    const trendBias = (idx - 4.5) * variation * 0.06;
    return Number((currentValue + trendBias + Math.random() * variation).toFixed(2));
  });
}

export default function SensorsScreen() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const sensorState = useSensorStatePoll(true, 1500);
  const payload = sensorState.data ?? FALLBACK_SENSOR_STATE;
  const livePayload = useMemo(
    () => ({
      mq2: payload.mq2,
      mq6: payload.mq6,
      temperature: payload.temperature,
      rh: payload.rh,
      wind: payload.wind,
      rain: payload.rain,
      month_num: payload.month_num,
    }),
    [payload.month_num, payload.mq2, payload.mq6, payload.rain, payload.rh, payload.temperature, payload.wind],
  );
  const result = usePredictPoll(livePayload, true, 1500);
  const chartWidth = Math.max(260, viewportWidth - spacing.md * 4);
  const gasLevel = useMemo(
    () => Number(((livePayload.mq2 + livePayload.mq6) / 2).toFixed(2)),
    [livePayload.mq2, livePayload.mq6],
  );
  const miniSeries = useMemo(
    () => ({
      temperature: buildHistory(livePayload.temperature, 2),
      gas: buildHistory(gasLevel, 14),
      humidity: buildHistory(livePayload.rh, 4),
    }),
    [gasLevel, livePayload.rh, livePayload.temperature],
  );
  const miniGraphLabels = useMemo(() => ['-9', '', '', '', '', '', '', '', '', '0'], []);
  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(29, 122, 70, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(90, 106, 96, ${opacity})`,
      propsForDots: {
        r: '2.5',
        strokeWidth: '1',
        stroke: colors.surface,
      },
      propsForBackgroundLines: {
        strokeDasharray: '3 3',
        stroke: colors.border,
      },
    }),
    [colors.border, colors.surface],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const latest = await sensorState.refetch();
      const refreshedPayload = {
        mq2: latest.data?.mq2 ?? livePayload.mq2,
        mq6: latest.data?.mq6 ?? livePayload.mq6,
        temperature: latest.data?.temperature ?? livePayload.temperature,
        rh: latest.data?.rh ?? livePayload.rh,
        wind: latest.data?.wind ?? livePayload.wind,
        rain: latest.data?.rain ?? livePayload.rain,
        month_num: latest.data?.month_num ?? livePayload.month_num,
      };

      await queryClient.fetchQuery({
        queryKey: ['predict', refreshedPayload],
        queryFn: () => api.predict(refreshedPayload),
      });
      await queryClient.invalidateQueries({ queryKey: ['predict'] });
    } finally {
      setRefreshing(false);
    }
  }, [livePayload.month_num, livePayload.mq2, livePayload.mq6, livePayload.rain, livePayload.rh, livePayload.temperature, livePayload.wind, queryClient, sensorState]);

  const fixedInputs = [
    { label: t.mq2, value: livePayload.mq2 },
    { label: t.mq6, value: livePayload.mq6 },
    { label: t.temperature, value: `${livePayload.temperature}°C` },
    { label: t.humidity, value: `${livePayload.rh}%` },
    { label: t.wind, value: livePayload.wind },
    { label: t.rain, value: `${livePayload.rain} mm` },
    { label: t.month, value: livePayload.month_num },
  ];

  return (
    <TabSwipeGesture currentPath="/(tabs)/sensors">
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        {/* Live Sensor Inputs (shared server state) */}
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
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <SymbolIcon sf="chart.bar.xaxis" fallbackName="stats-chart" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t.miniGraphs}</Text>
          </View>
          <Text style={styles.miniGraphNote}>{t.lastTenReadings}</Text>

          <View style={styles.chartBlock}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>{t.temperature}</Text>
              <Text style={styles.chartValue}>{livePayload.temperature.toFixed(1)}°C</Text>
            </View>
            <LineChart
              data={{
                labels: miniGraphLabels,
                datasets: [
                  {
                    data: miniSeries.temperature,
                    color: (opacity = 1) => `rgba(210, 79, 52, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={chartWidth}
              height={148}
              chartConfig={chartConfig}
              withInnerLines
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLabels
              fromZero={false}
              yLabelsOffset={6}
              style={styles.chart}
              bezier
            />
          </View>

          <View style={styles.chartBlock}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>{t.gas}</Text>
              <Text style={styles.chartValue}>{gasLevel.toFixed(1)}</Text>
            </View>
            <LineChart
              data={{
                labels: miniGraphLabels,
                datasets: [
                  {
                    data: miniSeries.gas,
                    color: (opacity = 1) => `rgba(157, 78, 221, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={chartWidth}
              height={148}
              chartConfig={chartConfig}
              withInnerLines
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLabels
              fromZero={false}
              yLabelsOffset={6}
              style={styles.chart}
              bezier
            />
          </View>

          <View style={styles.chartBlock}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>{t.humidity}</Text>
              <Text style={styles.chartValue}>{livePayload.rh.toFixed(1)}%</Text>
            </View>
            <LineChart
              data={{
                labels: miniGraphLabels,
                datasets: [
                  {
                    data: miniSeries.humidity,
                    color: (opacity = 1) => `rgba(40, 124, 210, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={chartWidth}
              height={148}
              chartConfig={chartConfig}
              withInnerLines
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLabels
              fromZero={false}
              yLabelsOffset={6}
              style={styles.chart}
              bezier
            />
          </View>
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
    miniGraphNote: {
      fontSize: typography.caption,
      color: colors.muted,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    chartBlock: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    chartTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    chartTitle: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text,
    },
    chartValue: {
      fontSize: typography.label,
      fontWeight: '700',
      color: colors.primary,
      fontVariant: ['tabular-nums'],
    },
    chart: {
      borderRadius: 12,
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
