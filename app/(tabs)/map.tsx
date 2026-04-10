import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertBanner } from '@/src/components/AlertBanner';
import { Card } from '@/src/components/Card';
import { LoadingState } from '@/src/components/LoadingState';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { useGlobalAlert, useStatusPoll, useVisionPoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

type MarkerTone = 'sensor' | 'camera';
type AlertSource = 'sensor' | 'vision' | null;

type FarmMarkerProps = {
  top: string;
  left: string;
  label: string;
  tone: MarkerTone;
  isAlert: boolean;
  alertColor: string;
  colors: AppColors;
};

function FarmMarker({ top, left, label, tone, isAlert, alertColor, colors }: FarmMarkerProps) {
  const baseColor = tone === 'sensor' ? colors.primary : colors.warningAlert;
  const icon =
    tone === 'sensor'
      ? { sf: 'dot.radiowaves.left.and.right', fallbackName: 'speedometer' }
      : { sf: 'camera.fill', fallbackName: 'camera' };

  return (
    <View
      style={[
        styles.marker,
        {
          top,
          left,
          borderColor: isAlert ? alertColor : `${baseColor}90`,
          backgroundColor: isAlert ? `${alertColor}22` : colors.surface,
        },
      ]}>
      <SymbolIcon
        sf={icon.sf}
        fallbackName={icon.fallbackName}
        size={18}
        color={isAlert ? alertColor : baseColor}
      />
      <Text style={[styles.markerText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

export default function MapScreen() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const stylesScoped = createStyles(colors);

  const status = useStatusPoll(true, 1500);
  const vision = useVisionPoll(Boolean(status.data?.camera_active));

  const sensorAlertRaw = status.data?.sensor_alert ?? 'SAFE';
  const visionAlertRaw =
    status.data?.vision_alert ??
    (status.data?.camera_active ? (vision.data?.summary.vision_alert ?? 'CLEAR') : 'CLEAR');
  const computedGlobalAlert = useGlobalAlert(sensorAlertRaw, visionAlertRaw);
  const globalAlert = status.data?.global_alert ?? computedGlobalAlert;
  const [activeSensorLabel, setActiveSensorLabel] = useState<'S1' | 'S2' | null>(null);
  const [activeCameraLabel, setActiveCameraLabel] = useState<'C1' | 'C2' | null>(null);

  const alertSource = useMemo<AlertSource>(() => {
    const visionAlert = status.data?.vision_alert ?? visionAlertRaw;
    const sensorAlert = status.data?.sensor_alert ?? sensorAlertRaw;

    if (visionAlert !== 'CLEAR') return 'vision';
    if (sensorAlert !== 'SAFE') return 'sensor';
    return null;
  }, [sensorAlertRaw, status.data?.sensor_alert, status.data?.vision_alert, visionAlertRaw]);

  useEffect(() => {
    if (globalAlert === 'SAFE' || !alertSource) {
      setActiveSensorLabel(null);
      setActiveCameraLabel(null);
      return;
    }

    if (alertSource === 'vision') {
      const picks: ('C1' | 'C2')[] = ['C1', 'C2'];
      const randomCamera = picks[Math.floor(Math.random() * picks.length)];
      setActiveCameraLabel(randomCamera);
      setActiveSensorLabel(null);
      return;
    }

    const picks: ('S1' | 'S2')[] = ['S1', 'S2'];
    const randomSensor = picks[Math.floor(Math.random() * picks.length)];
    setActiveSensorLabel(randomSensor);
    setActiveCameraLabel(null);
  }, [alertSource, globalAlert, status.data?.alert_updated_at]);

  if (status.isLoading) {
    return <LoadingState message={t.loading} />;
  }

  const mapAlertColor = globalAlert === 'FIRE' ? colors.fire : colors.warningAlert;
  const mapIsAlerting = globalAlert !== 'SAFE';

  return (
    <TabSwipeGesture currentPath="/(tabs)/map">
      <View style={stylesScoped.container}>
        <ScrollView
          style={stylesScoped.scroll}
          contentContainerStyle={[
            stylesScoped.content,
            { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) },
          ]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}>
          <AlertBanner alert={globalAlert} message={t.globalAlert} />

          <Card>
            <Text style={stylesScoped.sectionTitle}>{t.mapOverview}</Text>
            <Text style={stylesScoped.subtitle}>{t.mapDescription}</Text>
            <Text style={[stylesScoped.subtitle, { color: colors.primary }]}>{t.notifyCoverage}</Text>

            <View
              style={[
                stylesScoped.mapCanvas,
                mapIsAlerting && {
                  borderColor: mapAlertColor,
                  backgroundColor: `${mapAlertColor}12`,
                },
              ]}>
              <View style={[stylesScoped.plot, stylesScoped.plotA]} />
              <View style={[stylesScoped.plot, stylesScoped.plotB]} />
              <View style={[stylesScoped.plot, stylesScoped.plotC]} />
              <View style={[stylesScoped.plot, stylesScoped.plotD]} />
              <View style={stylesScoped.roadHorizontal} />
              <View style={stylesScoped.roadVertical} />
              <Text style={[stylesScoped.mapTag, stylesScoped.mapTagSensors]}>{t.mapSensors}</Text>
              <Text style={[stylesScoped.mapTag, stylesScoped.mapTagCameras]}>{t.mapCameras}</Text>
              <Text style={[stylesScoped.mapTag, stylesScoped.mapTagHot]}>{t.mapHotZone}</Text>

              <View
                style={[
                  stylesScoped.hotZone,
                  {
                    borderColor: mapIsAlerting ? mapAlertColor : colors.border,
                    backgroundColor: mapIsAlerting ? `${mapAlertColor}1A` : colors.surface,
                  },
                ]}>
                <Text
                  style={[
                    stylesScoped.hotZoneTitle,
                    { color: mapIsAlerting ? mapAlertColor : colors.text },
                  ]}>
                  {t.incidentLocation}
                </Text>
                <Text style={[stylesScoped.hotZoneState, { color: colors.text }]}>
                  {globalAlert === 'FIRE' ? t.fireDetected : globalAlert === 'WARNING' ? t.potentialFireAlert : t.safe}
                </Text>
              </View>

              <FarmMarker
                top="16%"
                left="9%"
                label="S1"
                tone="sensor"
                isAlert={activeSensorLabel === 'S1'}
                alertColor={mapAlertColor}
                colors={colors}
              />
              <FarmMarker
                top="64%"
                left="13%"
                label="S2"
                tone="sensor"
                isAlert={activeSensorLabel === 'S2'}
                alertColor={mapAlertColor}
                colors={colors}
              />
              <FarmMarker
                top="18%"
                left="72%"
                label="C1"
                tone="camera"
                isAlert={activeCameraLabel === 'C1'}
                alertColor={mapAlertColor}
                colors={colors}
              />
              <FarmMarker
                top="66%"
                left="70%"
                label="C2"
                tone="camera"
                isAlert={activeCameraLabel === 'C2'}
                alertColor={mapAlertColor}
                colors={colors}
              />
            </View>

            <View style={stylesScoped.legendRow}>
              <View style={stylesScoped.legendItem}>
                <SymbolIcon sf="dot.radiowaves.left.and.right" fallbackName="speedometer" size={16} color={colors.primary} />
                <Text style={stylesScoped.legendText}>{t.mapSensors}</Text>
              </View>
              <View style={stylesScoped.legendItem}>
                <SymbolIcon sf="camera.fill" fallbackName="camera" size={16} color={colors.warningAlert} />
                <Text style={stylesScoped.legendText}>{t.mapCameras}</Text>
              </View>
              <View style={stylesScoped.legendItem}>
                <SymbolIcon sf="flame.fill" fallbackName="flame" size={16} color={mapAlertColor} />
                <Text style={stylesScoped.legendText}>{t.mapHotZone}</Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    </TabSwipeGesture>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    minWidth: 56,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 3,
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

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
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.body,
      color: colors.muted,
      marginBottom: spacing.xs,
    },
    mapCanvas: {
      marginTop: spacing.md,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: '#DCEBCF',
      minHeight: 320,
      overflow: 'hidden',
      position: 'relative',
    },
    plot: {
      position: 'absolute',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(24, 50, 24, 0.12)',
      backgroundColor: 'rgba(110, 168, 95, 0.23)',
    },
    plotA: {
      top: '6%',
      left: '5%',
      width: '38%',
      height: '24%',
    },
    plotB: {
      top: '8%',
      right: '6%',
      width: '34%',
      height: '21%',
    },
    plotC: {
      bottom: '8%',
      left: '7%',
      width: '30%',
      height: '24%',
    },
    plotD: {
      bottom: '10%',
      right: '9%',
      width: '36%',
      height: '26%',
    },
    roadHorizontal: {
      position: 'absolute',
      top: '46%',
      left: 0,
      right: 0,
      height: 20,
      backgroundColor: 'rgba(199, 179, 141, 0.65)',
    },
    roadVertical: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '47%',
      width: 18,
      backgroundColor: 'rgba(199, 179, 141, 0.6)',
    },
    mapTag: {
      position: 'absolute',
      zIndex: 2,
      fontSize: typography.caption,
      fontWeight: '800',
      color: colors.text,
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderRadius: 999,
      overflow: 'hidden',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    mapTagSensors: {
      top: '3%',
      left: '6%',
    },
    mapTagCameras: {
      top: '3%',
      right: '6%',
    },
    mapTagHot: {
      top: '30%',
      left: '36%',
    },
    hotZone: {
      position: 'absolute',
      top: '36%',
      left: '36%',
      width: '30%',
      minHeight: 74,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.sm,
      zIndex: 2,
    },
    hotZoneTitle: {
      fontSize: typography.label,
      fontWeight: '800',
      textAlign: 'center',
    },
    hotZoneState: {
      marginTop: spacing.xs,
      fontSize: typography.caption,
      fontWeight: '700',
      textAlign: 'center',
    },
    legendRow: {
      marginTop: spacing.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    legendText: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: '700',
    },
  });
}
