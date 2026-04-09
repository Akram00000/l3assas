import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SymbolIcon } from '@/src/components/symbol-icon';
import { useLanguage } from '@/src/i18n';
import type { AppColors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAppTheme } from '@/src/theme/theme-context';
import { typography } from '@/src/theme/typography';

function createTabStyles(colors: AppColors, bottomInset: number) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: `${colors.border}A0`,
      paddingTop: spacing.xs,
      paddingBottom: Math.max(bottomInset, spacing.sm),
    },
    content: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    item: {
      minWidth: 116,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: 18,
      borderCurve: 'continuous',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
    },
    text: {
      fontSize: typography.label,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  });
}

function HorizontalTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createTabStyles(colors, insets.bottom);

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;

          const tint = isFocused ? colors.primary : colors.muted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const baseBorderColor = isFocused ? `${colors.primary}40` : colors.border;
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                styles.item,
                {
                  backgroundColor: isFocused ? `${colors.primary}1A` : colors.background,
                  borderColor: baseBorderColor,
                  boxShadow: isFocused ? colors.buttonShadow : undefined,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}>
              {options.tabBarIcon?.({ focused: isFocused, color: tint, size: 20 })}
              <Text style={[styles.text, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        animation: 'shift',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 220,
          },
        },
        tabBar: (props) => <HorizontalTabBar {...props} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t.home,
          tabBarIcon: ({ color }) => (
            <SymbolIcon sf="house.fill" fallbackName="home" size={24} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          title: t.sensors,
          tabBarIcon: ({ color }) => (
            <SymbolIcon sf="speedometer" fallbackName="speedometer" size={24} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: t.camera,
          tabBarIcon: ({ color }) => (
            <SymbolIcon sf="camera.fill" fallbackName="camera" size={24} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings,
          tabBarIcon: ({ color }) => (
            <SymbolIcon sf="gearshape.fill" fallbackName="settings" size={24} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
