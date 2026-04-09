import { router } from 'expo-router';
import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

type TabPath = '/(tabs)' | '/(tabs)/sensors' | '/(tabs)/camera' | '/(tabs)/settings';

const TAB_ORDER: TabPath[] = ['/(tabs)', '/(tabs)/sensors', '/(tabs)/camera', '/(tabs)/settings'];

type TabSwipeGestureProps = PropsWithChildren<{
  currentPath: TabPath;
}>;

export function TabSwipeGesture({ currentPath, children }: TabSwipeGestureProps) {
  const currentIndex = TAB_ORDER.indexOf(currentPath);

  const navigateByOffset = (offset: number) => {
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;
    router.navigate(TAB_ORDER[nextIndex]);
  };

  const swipeLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      runOnJS(navigateByOffset)(1);
    });

  const swipeRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      runOnJS(navigateByOffset)(-1);
    });

  return (
    <GestureDetector gesture={Gesture.Simultaneous(swipeLeft, swipeRight)}>
      <View style={styles.container}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
