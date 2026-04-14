import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, StyleSheet, Text, Vibration, View } from 'react-native';

import type { AlertLevel, VisionAlert } from '@/src/api/types';
import { Button } from '@/src/components/Button';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';
import { localizeAlertValue } from '@/src/utils/valueLabels';

type EmergencyAlertOverlayProps = {
  alert: AlertLevel;
  visionAlert: VisionAlert;
  soundEnabled: boolean;
  onAcknowledge: () => void;
  onFalseWarning: () => void;
};

const FIRE_COLOR = '#D81515';
const WARNING_COLOR = '#F58A07';

async function playSonorAlarm(alert: AlertLevel, language: 'ar' | 'fr', warningIsIntrusion: boolean) {
  if (Platform.OS === 'web') return;

  try {
    const Speech = await import('expo-speech');
    const message =
      alert === 'FIRE'
        ? language === 'ar'
          ? 'انذار حريق'
          : 'Alerte incendie'
        : warningIsIntrusion
          ? language === 'ar'
            ? 'تنبيه، تم كشف تسلل'
            : 'Alerte intrusion detectee'
        : language === 'ar'
          ? 'تنبيه، احتمال حريق'
          : 'Alerte, potentiel incendie';

    await Speech.stop();
    Speech.speak(message, {
      language: language === 'ar' ? 'ar-SA' : 'fr-FR',
      pitch: 1,
      rate: 0.95,
    });
  } catch {
    // Keep visual/haptic alert flow even when speech is unavailable.
  }
}

export function EmergencyAlertOverlay({
  alert,
  visionAlert,
  soundEnabled,
  onAcknowledge,
  onFalseWarning,
}: EmergencyAlertOverlayProps) {
  const { colors } = useAppTheme();
  const { t, language } = useLanguage();
  const styles = createStyles(colors);
  const fireFlash = useRef(new Animated.Value(0.45)).current;
  const warningFlash = useRef(new Animated.Value(0.18)).current;
  const previousAlertRef = useRef<AlertLevel>('SAFE');
  const isIntrusionWarning = alert === 'WARNING' && visionAlert === 'INTRUSION';

  useEffect(() => {
    if (alert === 'SAFE') {
      fireFlash.setValue(0.45);
      warningFlash.setValue(0.18);
      return;
    }

    if (alert === 'FIRE') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fireFlash, {
            toValue: 0.95,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(fireFlash, {
            toValue: 0.45,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => {
        animation.stop();
      };
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(warningFlash, {
          toValue: 0.42,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(warningFlash, {
          toValue: 0.18,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [alert, fireFlash, warningFlash]);

  useEffect(() => {
    const previous = previousAlertRef.current;
    const changed = previous !== alert;
    previousAlertRef.current = alert;

    if (Platform.OS === 'web') return;

    if (alert === 'SAFE') {
      Vibration.cancel();
      return;
    }

    if (changed && alert === 'FIRE') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }

    if (changed && alert === 'WARNING') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    if (changed && soundEnabled && (alert === 'FIRE' || alert === 'WARNING')) {
      void playSonorAlarm(alert, language, isIntrusionWarning);
    }

    if (alert === 'FIRE') {
      Vibration.vibrate([0, 420, 180, 420], true);
      return () => {
        Vibration.cancel();
      };
    }

    Vibration.vibrate(220);
    return () => {
      Vibration.cancel();
    };
  }, [alert, isIntrusionWarning, language, soundEnabled]);

  return (
    <>
      {alert === 'WARNING' && (
        <View style={styles.warningOverlayRoot}>
          <Animated.View pointerEvents="none" style={[styles.warningTint, { opacity: warningFlash }]} />
          <View style={styles.warningCard}>
            <Text style={styles.warningBadgeLabel}>{t.globalAlert}</Text>
            <Text style={styles.warningBadgeValue}>{isIntrusionWarning ? t.intrusionDetected : t.potentialFireAlert}</Text>
            <View style={styles.actionRow}>
              <Button
                title={t.okThanks}
                onPress={onAcknowledge}
                variant="secondary"
                icon="checkmark-circle"
                style={styles.actionButton}
              />
              <Button
                title={t.falseWarningAction}
                onPress={onFalseWarning}
                variant="warning"
                icon="warning"
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      )}

      <Modal
        transparent
        animationType="fade"
        statusBarTranslucent
        visible={alert === 'FIRE'}>
        <View style={styles.fireModalRoot}>
          <Animated.View style={[styles.fireTint, { opacity: fireFlash }]} />
          <View style={styles.fireCard}>
            <Text style={styles.fireTitle}>{t.globalAlert}</Text>
            <Text style={styles.fireValue}>{localizeAlertValue('FIRE', t)}</Text>
            <Text style={styles.fireHint}>{t.evacuateNow}</Text>
            <View style={styles.actionRow}>
              <Button
                title={t.okThanks}
                onPress={onAcknowledge}
                variant="secondary"
                icon="checkmark-circle"
                style={styles.actionButton}
              />
              <Button
                title={t.falseWarningAction}
                onPress={onFalseWarning}
                variant="warning"
                icon="warning"
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    warningOverlayRoot: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 70,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    warningTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: WARNING_COLOR,
    },
    warningCard: {
      width: '100%',
      maxWidth: 420,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.75)',
      backgroundColor: 'rgba(18, 8, 0, 0.55)',
      alignItems: 'center',
      gap: spacing.sm,
    },
    warningBadgeLabel: {
      color: '#FFFFFF',
      fontSize: typography.label,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    warningBadgeValue: {
      color: '#FFFFFF',
      fontSize: typography.heading,
      fontWeight: '900',
    },
    fireModalRoot: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
    fireTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: FIRE_COLOR,
    },
    fireCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 24,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      backgroundColor: 'rgba(16, 0, 0, 0.62)',
      alignItems: 'center',
      gap: spacing.md,
      boxShadow: colors.cardShadow,
    },
    fireTitle: {
      color: '#FFD7D7',
      fontSize: typography.label,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    fireValue: {
      color: '#FFFFFF',
      fontSize: 46,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    fireHint: {
      color: '#FFF5F5',
      fontSize: typography.alert,
      fontWeight: '700',
      textAlign: 'center',
    },
    actionRow: {
      width: '100%',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });
}
