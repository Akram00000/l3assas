import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/src/components/AlertBanner';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { LoadingState } from '@/src/components/LoadingState';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { StatusBadge } from '@/src/components/StatusBadge';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { useGlobalAlert, useStatusPoll, useVisionPoll } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { localizeVisionAlertValue } from '@/src/utils/valueLabels';

export default function HomeScreen() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const status = useStatusPoll();
  const vision = useVisionPoll(Boolean(status.data?.camera_active));
  
  const sensorAlertRaw = 'SAFE';
  const visionAlertRaw = vision.data?.summary.vision_alert ?? 'CLEAR';
  const globalAlert = useGlobalAlert(sensorAlertRaw, visionAlertRaw);

  if (status.isLoading) {
    return <LoadingState message={t.loading} />;
  }

  const isOffline = !status.data?.online;

  return (
    <TabSwipeGesture currentPath="/(tabs)">
    <SafeAreaView style={styles.container} edges={['top']}>
      {isOffline && <OfflineBanner message={t.offline} />}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t.appName}</Text>
            <Text style={styles.subtitle}>{t.appSubtitle}</Text>
          </View>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          </View>
        </View>

        {/* Global Alert */}
        <AlertBanner alert={globalAlert} message={t.globalAlert} />

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
              <Ionicons name="eye" size={24} color={colors.primary} />
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    logoContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: `${colors.primary}12`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: typography.body,
      color: colors.muted,
      fontWeight: '500',
      marginTop: spacing.xs,
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
  });
}
