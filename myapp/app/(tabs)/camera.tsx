import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { getApiBaseUrl } from '@/src/api/client';
import { api } from '@/src/api/endpoints';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { DetectionCard } from '@/src/components/DetectionCard';
import { LoadingState } from '@/src/components/LoadingState';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { useDemoModeSimulation } from '@/src/hooks/useDemoModeSimulation';
import { useSettings, useStatusPoll, useVisionPoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { localizeVisionAlertValue } from '@/src/utils/valueLabels';

export default function CameraScreen() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const queryClient = useQueryClient();
  const settings = useSettings();
  const demo = useDemoModeSimulation(Boolean(settings.load.data?.demoMode));
  const status = useStatusPoll(true, 1500);
  const detections = useVisionPoll(Boolean(demo.statusOverride?.camera_active ?? status.data?.camera_active));
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const cameraActive = Boolean(demo.statusOverride?.camera_active ?? status.data?.camera_active);
  const usingRealStream = Boolean(status.data?.camera_active);
  const effectiveDetections = demo.detectionsOverride ?? detections.data;

  const refreshCameraState = async () => {
    await queryClient.invalidateQueries({ queryKey: ['status'] });
    await queryClient.invalidateQueries({ queryKey: ['camera-detections'] });
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await api.cameraStart({ cam_id: 0 });
      await refreshCameraState();
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await api.cameraStop();
      await refreshCameraState();
    } finally {
      setIsStopping(false);
    }
  };

  const fireCount = effectiveDetections?.fire.filter((d) => d.class_id === 1).length ?? 0;
  const smokeCount = effectiveDetections?.fire.filter((d) => d.class_id === 0).length ?? 0;
  const personCount = effectiveDetections?.intruder.filter((d) => d.class_id === 0).length ?? 0;
  const animalCount = effectiveDetections?.intruder.filter((d) => d.class_id === 1).length ?? 0;
  const fireConfidence = effectiveDetections?.fire
    .filter((d) => d.class_id === 1)
    .reduce((max, d) => Math.max(max, d.confidence), 0) ?? 0;
  const smokeConfidence = effectiveDetections?.fire
    .filter((d) => d.class_id === 0)
    .reduce((max, d) => Math.max(max, d.confidence), 0) ?? 0;
  const humanConfidence = effectiveDetections?.intruder
    .filter((d) => d.class_id === 0)
    .reduce((max, d) => Math.max(max, d.confidence), 0) ?? 0;
  const animalConfidence = effectiveDetections?.intruder
    .filter((d) => d.class_id === 1)
    .reduce((max, d) => Math.max(max, d.confidence), 0) ?? 0;

  const overlayAlerts = useMemo(
    () => [
      fireCount > 0
        ? { key: 'fire', label: '🔴 FIRE DETECTED', confidence: fireConfidence, color: '#FF2D2D' }
        : null,
      smokeCount > 0
        ? { key: 'smoke', label: '🟡 SMOKE DETECTED', confidence: smokeConfidence, color: '#FFD60A' }
        : null,
      personCount > 0
        ? { key: 'human', label: '🟣 HUMAN', confidence: humanConfidence, color: '#BF5AF2' }
        : null,
      animalCount > 0
        ? { key: 'animal', label: '🟢 ANIMAL', confidence: animalConfidence, color: '#32D74B' }
        : null,
    ].filter((item): item is { key: string; label: string; confidence: number; color: string } => item !== null),
    [animalConfidence, animalCount, fireConfidence, fireCount, humanConfidence, personCount, smokeConfidence, smokeCount],
  );

  if (!demo.enabled && status.isPending && !status.data) {
    return <LoadingState message={t.loading} />;
  }

  return (
    <TabSwipeGesture currentPath="/(tabs)/camera">
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}>
        {/* Camera Controls */}
        <Card>
          <View style={styles.cardHeader}>
            <SymbolIcon sf="camera.fill" fallbackName="camera" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t.camera}</Text>
          </View>
          {demo.enabled && !demo.fireTriggered && (
            <View style={styles.demoCountdownBadge}>
              <Text style={styles.demoCountdownText}>{t.demoModeCountdown}: {demo.countdownSeconds}</Text>
            </View>
          )}
          <View style={styles.controlsRow}>
            <Button
              title={t.start}
              onPress={handleStart}
              icon="play"
              variant="primary"
              disabled={cameraActive || demo.enabled}
              loading={isStarting}
              style={styles.controlButton}
            />
            <Button
              title={t.stop}
              onPress={handleStop}
              icon="stop"
              variant="danger"
              disabled={!cameraActive || demo.enabled}
              loading={isStopping}
              style={styles.controlButton}
            />
          </View>
        </Card>

        {/* Camera Stream */}
        <Card style={styles.streamCard}>
          <View style={styles.streamWrapper}>
            {usingRealStream ? (
              <WebView
                source={{ uri: `${getApiBaseUrl()}/camera/stream` }}
                style={styles.stream}
              />
            ) : (
              <View style={styles.streamPlaceholder}>
                <SymbolIcon sf="camera.fill" fallbackName="camera" size={64} color={demo.enabled ? colors.warningAlert : colors.muted} />
                <Text style={styles.placeholderText}>{demo.enabled ? t.demoStreamActive : t.cameraInactive}</Text>
              </View>
            )}

            {cameraActive && overlayAlerts.length > 0 && (
              <View pointerEvents="none" style={styles.overlayContainer}>
                <View style={styles.overlayLabelsGroup}>
                  {overlayAlerts.map((entry) => (
                    <View key={entry.key} style={[styles.alertChip, { borderColor: entry.color }]}> 
                      <Text style={[styles.alertChipText, { color: entry.color }]}>{entry.label}</Text>
                      <Text style={[styles.alertChipConfidence, { color: '#FFFFFF' }]}>
                        {Math.round(entry.confidence * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.liveConfidenceBanner}>
                  <Text style={styles.liveConfidenceText}>AI CONFIDENCE ON SCREEN</Text>
                </View>
              </View>
            )}

            {demo.enabled && !demo.fireTriggered && (
              <View pointerEvents="none" style={styles.streamCountdownOverlay}>
                <Text style={styles.streamCountdownText}>{t.demoModeCountdown}: {demo.countdownSeconds}</Text>
              </View>
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <SymbolIcon sf="square.grid.2x2.fill" fallbackName="options" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Bounding Boxes Legend</Text>
          </View>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#FF2D2D' }]} />
              <Text style={styles.legendText}>Red = Fire</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#FFD60A' }]} />
              <Text style={styles.legendText}>Yellow = Smoke</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#BF5AF2' }]} />
              <Text style={styles.legendText}>Purple = Human</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#32D74B' }]} />
              <Text style={styles.legendText}>Green = Animal</Text>
            </View>
          </View>
        </Card>

        {/* Detections */}
        {cameraActive && (
          <Card>
            <View style={styles.cardHeader}>
              <SymbolIcon sf="chart.bar.xaxis" fallbackName="stats-chart" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t.detections}</Text>
            </View>
            <View style={styles.detectionsGrid}>
              <DetectionCard type="fire" count={fireCount} label={t.fireDetection} />
              <DetectionCard type="smoke" count={smokeCount} label={t.smokeDetection} />
              <DetectionCard type="person" count={personCount} label={t.personDetection} />
              <DetectionCard type="animal" count={animalCount} label={t.animalDetection} />
            </View>
            
            {effectiveDetections && (
              <View style={styles.visionAlert}>
                <Text style={styles.visionAlertLabel}>{t.visionAlert}:</Text>
                <Text selectable style={[styles.visionAlertValue, { color: colors.primary }]}> 
                  {localizeVisionAlertValue(effectiveDetections.summary.vision_alert, t)}
                </Text>
              </View>
            )}
          </Card>
        )}
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
    controlsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    demoCountdownBadge: {
      alignSelf: 'flex-start',
      marginBottom: spacing.md,
      backgroundColor: `${colors.warningAlert}1A`,
      borderColor: colors.warningAlert,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    demoCountdownText: {
      color: colors.warningAlert,
      fontSize: typography.caption,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    controlButton: {
      flex: 1,
    },
    streamCard: {
      padding: 0,
      overflow: 'hidden',
      borderRadius: 20,
    },
    streamWrapper: {
      position: 'relative',
    },
    stream: {
      height: 300,
      backgroundColor: '#000',
    },
    streamCountdownOverlay: {
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
      backgroundColor: 'rgba(12,12,12,0.78)',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    streamCountdownText: {
      color: '#FFFFFF',
      fontSize: typography.caption,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    streamPlaceholder: {
      height: 300,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    placeholderText: {
      fontSize: typography.body,
      color: colors.muted,
      fontWeight: '500',
    },
    overlayContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    overlayLabelsGroup: {
      gap: spacing.sm,
    },
    alertChip: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0,0,0,0.72)',
      borderWidth: 2,
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 210,
    },
    alertChipText: {
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    alertChipConfidence: {
      marginTop: spacing.xs,
      fontSize: typography.body,
      fontWeight: '700',
    },
    liveConfidenceBanner: {
      alignSelf: 'center',
      backgroundColor: 'rgba(12,12,12,0.74)',
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.38)',
    },
    liveConfidenceText: {
      color: '#FFFFFF',
      fontSize: typography.caption,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    legendGrid: {
      gap: spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    legendSwatch: {
      width: 16,
      height: 16,
      borderRadius: 4,
    },
    legendText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text,
    },
    detectionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    visionAlert: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    visionAlertLabel: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.muted,
    },
    visionAlertValue: {
      fontSize: typography.heading,
      fontWeight: '700',
    },
  });
}
