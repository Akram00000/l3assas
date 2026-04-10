import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertBanner } from '@/src/components/AlertBanner';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { LoadingState } from '@/src/components/LoadingState';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { StatusBadge } from '@/src/components/StatusBadge';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { useGlobalAlert, usePredictPoll, useSensorStatePoll, useStatusPoll, useVisionPoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { PredictRequest } from '@/src/api/types';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { shouldTreatAsSafeFromFalseWarning } from '@/src/utils/falseWarningSession';
import { localizeSpreadLevelValue, localizeVisionAlertValue } from '@/src/utils/valueLabels';

const FALLBACK_SENSOR_PAYLOAD: PredictRequest = {
  mq2: 100,
  mq6: 80,
  temperature: 20,
  rh: 60,
  wind: 5,
  rain: 0,
  month_num: 7,
};

export default function HomeScreen() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const status = useStatusPoll(true, 1500);
  const vision = useVisionPoll(Boolean(status.data?.camera_active));
  const sensorState = useSensorStatePoll(true, 1500);
  const incidentPayload = useMemo(
    () => ({
      mq2: sensorState.data?.mq2 ?? FALLBACK_SENSOR_PAYLOAD.mq2,
      mq6: sensorState.data?.mq6 ?? FALLBACK_SENSOR_PAYLOAD.mq6,
      temperature: sensorState.data?.temperature ?? FALLBACK_SENSOR_PAYLOAD.temperature,
      rh: sensorState.data?.rh ?? FALLBACK_SENSOR_PAYLOAD.rh,
      wind: sensorState.data?.wind ?? FALLBACK_SENSOR_PAYLOAD.wind,
      rain: sensorState.data?.rain ?? FALLBACK_SENSOR_PAYLOAD.rain,
      month_num: sensorState.data?.month_num ?? FALLBACK_SENSOR_PAYLOAD.month_num,
    }),
    [
      sensorState.data?.month_num,
      sensorState.data?.mq2,
      sensorState.data?.mq6,
      sensorState.data?.rain,
      sensorState.data?.rh,
      sensorState.data?.temperature,
      sensorState.data?.wind,
    ],
  );
  const incidentPredict = usePredictPoll(incidentPayload, true, 1500);
  
  const sensorAlertRaw = status.data?.sensor_alert ?? 'SAFE';
  const visionAlertRaw = status.data?.vision_alert ?? (status.data?.camera_active ? (vision.data?.summary.vision_alert ?? 'CLEAR') : 'CLEAR');
  const computedGlobalAlert = useGlobalAlert(sensorAlertRaw, visionAlertRaw);
  const globalAlertRaw = status.data?.global_alert ?? computedGlobalAlert;
  const suppressedBySessionSafe = shouldTreatAsSafeFromFalseWarning(sensorState.data);
  const globalAlert = suppressedBySessionSafe ? 'SAFE' : globalAlertRaw;
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (status.isLoading) {
    return <LoadingState message={t.loading} />;
  }

  const isOffline = !status.data?.online;
  const alertUpdatedAt = Number(status.data?.alert_updated_at ?? 0);
  const secondsAgo = alertUpdatedAt > 0 ? Math.max(0, Math.floor(nowSec - alertUpdatedAt)) : 0;
  const confidencePct = incidentPredict.data
    ? Math.round(Math.max(0, Math.min(1, incidentPredict.data.confidence)) * 100)
    : null;
  const incidentAccent = globalAlert === 'FIRE' ? colors.fire : colors.warningAlert;

  return (
    <TabSwipeGesture currentPath="/(tabs)">
    <View style={styles.container}>
      {isOffline && (
        <View style={[styles.offlineWrapper, { paddingTop: insets.top }]}>
          <OfflineBanner message={t.offline} />
        </View>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Global Alert */}
        <AlertBanner alert={globalAlert} message={t.globalAlert} />

        {/* Live Incident Card */}
        {globalAlert !== 'SAFE' && (
          <Card
            style={[
              styles.incidentCard,
              {
                borderColor: incidentAccent,
                backgroundColor: `${incidentAccent}1A`,
              },
            ]}>
            <Text style={[styles.incidentTitle, { color: incidentAccent }]}>
              {globalAlert === 'FIRE' ? t.fireDetected : t.warningDetected}
            </Text>
            <Text style={styles.incidentLine}>{t.incidentLocation}</Text>
            <Text style={styles.incidentLine}>
              ⏱ {secondsAgo} {t.secondsWord}
            </Text>
            <Text style={styles.incidentLine}>
              {t.spreadLabel}: {localizeSpreadLevelValue(incidentPredict.data?.spread_speed?.level ?? '--', t)}
            </Text>
            <Text style={styles.incidentLine}>
              {t.confidenceLabel}: {confidencePct === null ? '--' : `${confidencePct}%`}
            </Text>
          </Card>
        )}

        {/* System Status */}
        <Card>
          <Text style={styles.sectionTitle}>{t.systemStatus}</Text>
          <View style={styles.statusGrid}>
            <StatusBadge label={t.serverOnline} status={status.data?.online ?? false} icon="server" />
            <StatusBadge label={t.sensorsOk} status={status.data?.sensors_ok ?? false} icon="speedometer" />
            <StatusBadge label={t.visionOk} status={status.data?.vision_ok ?? false} icon="eye" />
            <StatusBadge
              label={status.data?.camera_active ? t.cameraActive : t.cameraInactive}
              status={status.data?.camera_active ?? false}
              icon="camera"
            />
          </View>
        </Card>

        {/* Vision Summary */}
        {vision.data && (
          <Card>
            <View style={styles.cardHeader}>
              <SymbolIcon sf="eye.fill" fallbackName="eye" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t.visionAlert}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t.alert}</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  {localizeVisionAlertValue(vision.data.summary.vision_alert, t)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t.detections}</Text>
                <Text style={styles.summaryValue}>
                  {vision.data.fire.length + vision.data.intruder.length}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <Text style={styles.sectionTitle}>{t.quickActions}</Text>
          <View style={styles.actionsGrid}>
            <Button
              title={t.checkSensors}
              onPress={() => router.push('/(tabs)/sensors')}
              icon="speedometer"
              variant="primary"
            />
            <Button
              title={t.viewCamera}
              onPress={() => router.push('/(tabs)/camera')}
              icon="camera"
              variant="secondary"
            />
          </View>
        </Card>
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
    offlineWrapper: {
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
    header: {
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    logoImage: {
      width: 156,
      height: 156,
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
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    summaryItem: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      gap: spacing.xs,
    },
    summaryLabel: {
      fontSize: typography.label,
      color: colors.muted,
      fontWeight: '600',
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    actionsGrid: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    incidentCard: {
      borderWidth: 2,
      gap: spacing.sm,
    },
    incidentTitle: {
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    incidentLine: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text,
    },
  });
}
