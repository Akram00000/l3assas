import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDefaultApiBaseUrl } from '@/src/api/client';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { Input } from '@/src/components/Input';
import { LoadingState } from '@/src/components/LoadingState';
import { SymbolIcon } from '@/src/components/symbol-icon';
import { TabSwipeGesture } from '@/src/components/TabSwipeGesture';
import { useSettings } from '@/src/hooks/appHooks';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

export default function SettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { colors, isDark, toggleMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const settings = useSettings();
  const initial = settings.load.data;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [apiBaseUrl, setApiBaseUrl] = useState(getDefaultApiBaseUrl());

  useEffect(() => {
    if (!initial) return;
    setSoundEnabled(initial.soundEnabled);
    setApiBaseUrl(initial.apiBaseUrl);
  }, [initial]);

  const handleSave = () => {
    settings.save.mutate(
      { soundEnabled, apiBaseUrl },
      {
        onSuccess: () => Alert.alert(t.success, t.configSaved),
        onError: () => Alert.alert(t.error, t.configSaveFailed),
      }
    );
  };

  if (settings.load.isLoading) {
    return <LoadingState message={t.loading} />;
  }

  return (
    <TabSwipeGesture currentPath="/(tabs)/settings">
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}>
        {/* Language Settings */}
        <Card>
          <View style={styles.cardHeader}>
            <SymbolIcon sf="globe" fallbackName="language" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t.language}</Text>
          </View>
          <View style={styles.languageButtons}>
            <Pressable
              style={[styles.languageButton, language === 'ar' && styles.languageButtonActive]}
              onPress={() => setLanguage('ar')}>
              <Text style={[styles.languageText, language === 'ar' && styles.languageTextActive]}>
                العربية
              </Text>
            </Pressable>
            <Pressable
              style={[styles.languageButton, language === 'fr' && styles.languageButtonActive]}
              onPress={() => setLanguage('fr')}>
              <Text style={[styles.languageText, language === 'fr' && styles.languageTextActive]}>
                Français
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* App Settings */}
        <Card>
          <View style={styles.cardHeader}>
            <SymbolIcon sf="gearshape.fill" fallbackName="settings" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t.settings}</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <SymbolIcon sf="moon.fill" fallbackName="moon" size={20} color={colors.primary} />
              <Text style={styles.settingText}>{t.darkMode}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => {
                void toggleMode();
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? '#ffffff' : '#f4f4f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <SymbolIcon sf="speaker.wave.3.fill" fallbackName="volume-high" size={20} color={colors.primary} />
              <Text style={styles.settingText}>{t.soundAlerts}</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.apiUrlContainer}>
            <Input
              label={t.apiUrl}
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              placeholder="http://192.168.1.50:5000"
              icon="link"
              keyboardType="url"
            />
            <Text selectable style={styles.note}>{t.apiUrlNote}</Text>
          </View>

          <Button
            title={t.save}
            onPress={handleSave}
            icon="save"
            variant="primary"
            loading={settings.save.isPending}
          />
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
    languageButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    languageButton: {
      flex: 1,
      minHeight: spacing.touchTarget + 8,
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    languageButtonActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}15`,
    },
    languageText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.muted,
    },
    languageTextActive: {
      color: colors.primary,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    settingText: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.text,
    },
    apiUrlContainer: {
      marginTop: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    note: {
      fontSize: typography.caption,
      color: colors.muted,
      fontStyle: 'italic',
    },
  });
}
