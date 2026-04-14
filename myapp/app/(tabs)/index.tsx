import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { LoadingState } from '@/src/components/LoadingState';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { StatusBadge } from '@/src/components/StatusBadge';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { useDemoModeSimulation } from '@/src/hooks/useDemoModeSimulation';
import { useGlobalAlert, usePredictPoll, useSensorStatePoll, useSettings, useStatusPoll, useVisionPoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { PredictRequest } from '@/src/api/types';
import type { AppColors } from '@/src/theme/colors';
import { getAlertColor } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { shouldTreatAsSafeFromFalseWarning } from '@/src/utils/falseWarningSession';
import { localizeAlertValue, localizeSpreadLevelValue } from '@/src/utils/valueLabels';

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
  const settings = useSettings();
  const demo = useDemoModeSimulation(Boolean(settings.load.data?.demoMode));
  const status = useStatusPoll(true, 1500);
  const vision = useVisionPoll(Boolean(demo.statusOverride?.camera_active ?? status.data?.camera_active));
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

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [tempSamples, setTempSamples] = useState<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof sensorState.data?.temperature !== 'number') return;
    setTempSamples((prev) => {
      const next = [...prev, sensorState.data.temperature].slice(-6);
      return next;
    });
  }, [sensorState.data?.temperature]);

  const visionData = demo.detectionsOverride ?? vision.data;
  const sensorAlertRaw = demo.statusOverride?.sensor_alert ?? status.data?.sensor_alert ?? 'SAFE';
  const visionAlertRaw =
    demo.statusOverride?.vision_alert ??
    status.data?.vision_alert ??
    ((demo.statusOverride?.camera_active ?? status.data?.camera_active)
      ? (visionData?.summary.vision_alert ?? 'CLEAR')
      : 'CLEAR');
  const computedGlobalAlert = useGlobalAlert(sensorAlertRaw, visionAlertRaw);
  const globalAlertRaw = demo.statusOverride?.global_alert ?? status.data?.global_alert ?? computedGlobalAlert;
  const suppressedBySessionSafe = shouldTreatAsSafeFromFalseWarning(sensorState.data);
  const globalAlert = suppressedBySessionSafe ? 'SAFE' : globalAlertRaw;

  if (!demo.enabled && status.isPending && !status.data) {
    return <LoadingState message={t.loading} />;
  }

  const isOffline = !demo.enabled && status.isError && !status.data;
  const alertUpdatedAt = Number(demo.statusOverride?.alert_updated_at ?? status.data?.alert_updated_at ?? 0);
  const secondsAgo = alertUpdatedAt > 0 ? Math.max(0, Math.floor(nowSec - alertUpdatedAt)) : 0;
  const incidentPredictData = demo.incidentOverride ?? incidentPredict.data;
  const confidencePct = incidentPredictData
    ? Math.round(Math.max(0, Math.min(1, incidentPredictData.confidence ?? 0)) * 100)
    : null;
  const spreadLevel = incidentPredictData?.spread_speed?.level;
  const incidentAccent = globalAlert === 'FIRE' ? colors.fire : colors.warningAlert;
  const statusOnline = demo.enabled ? true : (status.data?.online ?? false);
  const sensorsOk = demo.enabled ? true : (status.data?.sensors_ok ?? false);
  const visionOk = demo.enabled ? true : (status.data?.vision_ok ?? false);
  const cameraActive = Boolean(demo.statusOverride?.camera_active ?? status.data?.camera_active);
  const risingTemp = tempSamples.length >= 3 && tempSamples[tempSamples.length - 1] > tempSamples[0] + 0.8;
  const highMq2 = incidentPayload.mq2 >= 130;
  const smokeFromCamera = Boolean(visionData?.summary.has_smoke || visionData?.summary.has_fire || visionAlertRaw === 'SMOKE' || visionAlertRaw === 'FIRE');
  const intrusionFromCamera = Boolean(visionData?.summary.has_person || visionData?.summary.has_animal || visionAlertRaw === 'INTRUSION');
  const isIntrusionWarning = globalAlert === 'WARNING' && visionAlertRaw === 'INTRUSION';
  const aiReasons: string[] = [];
  if (globalAlert !== 'SAFE') {
    if (demo.fireTriggered || highMq2) aiReasons.push(t.reasonHighMq2);
    if (demo.fireTriggered || risingTemp) aiReasons.push(t.reasonTempRising);
    if (demo.fireTriggered || smokeFromCamera) aiReasons.push(t.reasonSmokeCamera);
    if (intrusionFromCamera) aiReasons.push(t.reasonIntrusionCamera);
    if (aiReasons.length === 0) aiReasons.push(isIntrusionWarning ? t.reasonIntrusionCamera : t.reasonSmokeCamera);
  }
  const alertColor = getAlertColor(globalAlert, colors);
  const lastUpdateClock = alertUpdatedAt > 0 ? new Date(alertUpdatedAt * 1000).toLocaleTimeString() : '--';

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
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Card style={[styles.globalAlertCard, { borderColor: alertColor, backgroundColor: `${alertColor}1A` }]}>
          <Text style={styles.globalAlertCaption}>{t.globalAlert.toUpperCase()}</Text>
          <Text style={[styles.globalAlertValue, { color: alertColor }]}>{localizeAlertValue(globalAlert, t)}</Text>
          {demo.enabled && !demo.fireTriggered && (
            <Text style={styles.globalAlertHint}>{t.demoModeCountdown}: {demo.countdownSeconds}</Text>
          )}
        </Card>

        {globalAlert !== 'SAFE' && (
          <Card>
            <Text style={styles.sectionTitle}>{t.whyThisAlert}</Text>
            <View style={styles.reasonList}>
              {aiReasons.map((reason, idx) => (
                <View key={`${reason}-${idx}`} style={styles.reasonItem}>
                  <SymbolIcon sf="exclamationmark.circle.fill" fallbackName="alert-circle" size={16} color={colors.primary} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* System Status */}
        <Card>
          <Text style={styles.sectionTitle}>{t.systemStatus}</Text>
          <View style={styles.statusGrid}>
            <StatusBadge label={t.serverOnline} status={statusOnline} icon="server" />
            <StatusBadge label={t.sensorsOk} status={sensorsOk} icon="speedometer" />
            <StatusBadge label={t.visionOk} status={visionOk} icon="eye" />
            <StatusBadge
              label={cameraActive ? t.cameraActive : t.cameraInactive}
              status={cameraActive}
              icon="camera"
            />
          </View>
        </Card>

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
              {globalAlert === 'FIRE' ? t.fireDetected : isIntrusionWarning ? t.intrusionDetected : t.warningDetected}
            </Text>
            <Text style={styles.incidentLine}>{t.incidentLocation}</Text>
            <Text style={styles.incidentLine}>
              {t.spreadLabel}: {localizeSpreadLevelValue(spreadLevel ?? '--', t)}
            </Text>
            <Text style={styles.incidentLine}>
              {t.confidenceLabel}: {confidencePct === null ? '--' : `${confidencePct}%`}
            </Text>
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>{t.lastUpdateTime}</Text>
          <Text style={styles.updateClock}>{lastUpdateClock}</Text>
          <Text style={styles.updateRelative}>{secondsAgo} {t.secondsWord}</Text>
        </Card>

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
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionsGrid: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    globalAlertCard: {
      borderWidth: 2,
      alignItems: 'center',
      gap: spacing.xs,
    },
    globalAlertCaption: {
      fontSize: typography.label,
      color: colors.muted,
      fontWeight: '700',
      letterSpacing: 1,
    },
    globalAlertValue: {
      fontSize: 40,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    globalAlertHint: {
      fontSize: typography.caption,
      color: colors.text,
      fontWeight: '700',
    },
    reasonList: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    reasonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    reasonText: {
      flex: 1,
      color: colors.text,
      fontSize: typography.body,
      fontWeight: '600',
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
    updateClock: {
      marginTop: spacing.sm,
      color: colors.primary,
      fontSize: 28,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    updateRelative: {
      marginTop: spacing.xs,
      color: colors.muted,
      fontSize: typography.body,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
  });
}
