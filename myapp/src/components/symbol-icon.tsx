import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import type { ImageStyle, StyleProp } from 'react-native';

type SymbolMeta = {
  sf: string;
  fallbackName: string;
};

const ICON_MAP: Record<string, SymbolMeta> = {
  home: { sf: 'house.fill', fallbackName: 'home' },
  speedometer: { sf: 'speedometer', fallbackName: 'speedometer' },
  camera: { sf: 'camera.fill', fallbackName: 'camera' },
  settings: { sf: 'gearshape.fill', fallbackName: 'settings' },
  server: { sf: 'externaldrive.fill', fallbackName: 'server' },
  eye: { sf: 'eye.fill', fallbackName: 'eye' },
  play: { sf: 'play.fill', fallbackName: 'play' },
  stop: { sf: 'stop.fill', fallbackName: 'stop' },
  send: { sf: 'paperplane.fill', fallbackName: 'send' },
  save: { sf: 'square.and.arrow.down.fill', fallbackName: 'save' },
  refresh: { sf: 'arrow.clockwise', fallbackName: 'refresh' },
  link: { sf: 'link', fallbackName: 'link' },
  moon: { sf: 'moon.fill', fallbackName: 'moon' },
  'volume-high': { sf: 'speaker.wave.3.fill', fallbackName: 'volume-high' },
  'camera-off': { sf: 'camera.slash.fill', fallbackName: 'camera-off' },
  options: { sf: 'slider.horizontal.3', fallbackName: 'options' },
  flame: { sf: 'flame.fill', fallbackName: 'flame' },
  warning: { sf: 'exclamationmark.triangle.fill', fallbackName: 'warning' },
  'checkmark-circle': { sf: 'checkmark.circle.fill', fallbackName: 'checkmark-circle' },
  language: { sf: 'globe', fallbackName: 'language' },
  analytics: { sf: 'chart.bar.xaxis', fallbackName: 'stats-chart' },
  person: { sf: 'person.fill', fallbackName: 'person' },
  paw: { sf: 'pawprint.fill', fallbackName: 'paw' },
  'cloud-offline': { sf: 'wifi.slash', fallbackName: 'cloud-offline' },
  'alert-circle': { sf: 'exclamationmark.circle.fill', fallbackName: 'alert-circle' },
  ellipse: { sf: 'circle.fill', fallbackName: 'ellipse' },
};

export function resolveSymbolFromLegacy(name?: string): SymbolMeta {
  if (!name) {
    return ICON_MAP.ellipse;
  }

  const mapped = ICON_MAP[name];
  if (mapped) return mapped;

  const fallbackName =
    name in Ionicons.glyphMap ? name : ICON_MAP.ellipse.fallbackName;

  return {
    sf: 'circle.fill',
    fallbackName,
  };
}

type SymbolIconProps = {
  sf: string;
  fallbackName?: string;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
};

export function SymbolIcon({ sf, fallbackName = 'ellipse', size = 20, color = '#111', style }: SymbolIconProps) {
  if (process.env.EXPO_OS === 'ios') {
    return (
      <Image
        source={`sf:${sf}`}
        contentFit="contain"
        style={[{ width: size, height: size, tintColor: color }, style]}
      />
    );
  }

  return <Ionicons name={fallbackName as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
}
