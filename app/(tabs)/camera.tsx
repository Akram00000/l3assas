import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import { useStatusPoll, useVisionPoll } from '@/src/hooks/appHooks';
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
  const status = useStatusPoll(true, 1500);
  const detections = useVisionPoll(Boolean(status.data?.camera_active));
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

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

  const fireCount = detections.data?.fire.filter((d) => d.class_id === 1).length ?? 0;
  const smokeCount = detections.data?.fire.filter((d) => d.class_id === 0).length ?? 0;
  const personCount = detections.data?.intruder.filter((d) => d.class_id === 0).length ?? 0;
  const animalCount = detections.data?.intruder.filter((d) => d.class_id === 1).length ?? 0;

  if (status.isLoading) {
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
          <View style={styles.controlsRow}>
            <Button
              title={t.start}
              onPress={handleStart}
              icon="play"
              variant="primary"
              disabled={status.data?.camera_active}
              loading={isStarting}
              style={styles.controlButton}
            />
            <Button
              title={t.stop}
              onPress={handleStop}
              icon="stop"
              variant="danger"
              disabled={!status.data?.camera_active}
              loading={isStopping}
              style={styles.controlButton}
            />
          </View>
        </Card>

        {/* Camera Stream */}
        <Card style={styles.streamCard}>
          {status.data?.camera_active ? (
            <WebView
              source={{ uri: `${getApiBaseUrl()}/camera/stream` }}
              style={styles.stream}
            />
          ) : (
            <View style={styles.streamPlaceholder}>
              <SymbolIcon sf="camera.slash.fill" fallbackName="camera-off" size={64} color={colors.muted} />
              <Text style={styles.placeholderText}>{t.cameraInactive}</Text>
            </View>
          )}
        </Card>

        {/* Detections */}
        {status.data?.camera_active && (
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
            
            {detections.data && (
              <View style={styles.visionAlert}>
                <Text style={styles.visionAlertLabel}>{t.visionAlert}:</Text>
                <Text selectable style={[styles.visionAlertValue, { color: colors.primary }]}> 
                  {localizeVisionAlertValue(detections.data.summary.vision_alert, t)}
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
    controlButton: {
      flex: 1,
    },
    streamCard: {
      padding: 0,
      overflow: 'hidden',
      borderRadius: 20,
    },
    stream: {
      height: 300,
      backgroundColor: '#000',
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
