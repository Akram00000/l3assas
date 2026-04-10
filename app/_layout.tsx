import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { LanguageProvider } from '@/src/i18n';
import { useMobilePushRegistration } from '@/src/hooks/useMobilePushNotifications';
import { AppThemeProvider, useAppTheme } from '@/src/theme/theme-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

function StartupOverlay() {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.85, 1.05, 1],
  });

  return (
    <View style={[styles.startContainer, { backgroundColor: colors.surface }]}>
      <Animated.Image
        source={require('../assets/images/logo.png')}
        resizeMode="contain"
        style={[styles.startImage, { opacity, transform: [{ scale }] }]}
      />
    </View>
  );
}

function RootNavigator() {
  const { isDark, colors } = useAppTheme();
  const [showStartup, setShowStartup] = useState(true);
  useMobilePushRegistration();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStartup(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.surface,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        notification: colors.warning,
      },
    };
  }, [isDark, colors]);

  if (showStartup) {
    return (
      <>
        <StartupOverlay />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <AppThemeProvider>
          <LanguageProvider>
            <RootNavigator />
          </LanguageProvider>
        </AppThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureRoot: {
    flex: 1,
  },
  startImage: {
    width: 220,
    height: 220,
  },
});
