import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import type { CameraDetectionsResponse, PredictResponse, StatusResponse } from '@/src/api/types';

const DEMO_FIRE_DELAY_MS = 10_000;

let demoStartAtMs: number | null = null;
let demoTriggeredAtMs: number | null = null;
let demoNotificationSent = false;

const demoDetectionsActive: CameraDetectionsResponse = {
  fire: [
    { class_id: 1, confidence: 0.92, bbox: [150, 90, 325, 290] },
    { class_id: 0, confidence: 0.83, bbox: [300, 110, 430, 250] },
  ],
  intruder: [{ class_id: 0, confidence: 0.81, bbox: [70, 130, 170, 300] }],
  summary: {
    has_fire: true,
    has_smoke: true,
    has_person: true,
    has_animal: false,
    vision_alert: 'FIRE',
  },
  camera_active: true,
};

const demoDetectionsIdle: CameraDetectionsResponse = {
  fire: [],
  intruder: [],
  summary: {
    has_fire: false,
    has_smoke: false,
    has_person: false,
    has_animal: false,
    vision_alert: 'CLEAR',
  },
  camera_active: true,
};

async function sendDemoLocalNotification() {
  if (Platform.OS === 'web') return;

  try {
    const Notifications = await import('expo-notifications');
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') {
        return;
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DEMO MODE: FIRE DETECTED',
        body: 'Alerte, potentiel incendie. Camera + capteurs en mode simulation.',
        sound: true,
      },
      trigger: null,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DEMO MODE: INTRUSION DETECTED',
        body: 'Presence humaine detectee par la camera (simulation).',
        sound: true,
      },
      trigger: null,
    });
  } catch {
    // Keep demo workflow running even if local notifications are unavailable.
  }
}

export function useDemoModeSimulation(enabled: boolean) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      demoStartAtMs = null;
      demoTriggeredAtMs = null;
      demoNotificationSent = false;
      return;
    }

    if (demoStartAtMs === null) {
      demoStartAtMs = Date.now();
      demoTriggeredAtMs = null;
      demoNotificationSent = false;
      setNowMs(Date.now());
    }

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [enabled]);

  const elapsedMs = enabled && demoStartAtMs !== null ? Math.max(0, nowMs - demoStartAtMs) : 0;
  const fireTriggered = enabled && elapsedMs >= DEMO_FIRE_DELAY_MS;

  useEffect(() => {
    if (!enabled || !fireTriggered) return;
    if (demoTriggeredAtMs === null) {
      demoTriggeredAtMs = Date.now();
      setNowMs(Date.now());
    }
  }, [enabled, fireTriggered]);

  useEffect(() => {
    if (!enabled || !fireTriggered || demoNotificationSent) return;
    demoNotificationSent = true;
    void sendDemoLocalNotification();
  }, [enabled, fireTriggered]);

  const countdownSeconds = Math.max(0, Math.ceil((DEMO_FIRE_DELAY_MS - elapsedMs) / 1000));

  const statusOverride = useMemo<Partial<StatusResponse> | null>(() => {
    if (!enabled) return null;

    if (fireTriggered) {
      return {
        camera_active: true,
        sensor_alert: 'WARNING',
        vision_alert: 'FIRE',
        global_alert: 'FIRE',
        alert_updated_at: Math.floor((demoTriggeredAtMs ?? nowMs) / 1000),
      };
    }

    return {
      camera_active: true,
      sensor_alert: 'SAFE',
      vision_alert: 'CLEAR',
      global_alert: 'SAFE',
      alert_updated_at: Math.floor((demoStartAtMs ?? nowMs) / 1000),
    };
  }, [enabled, fireTriggered, nowMs]);

  const detectionsOverride = useMemo<CameraDetectionsResponse | null>(() => {
    if (!enabled) return null;
    return fireTriggered ? demoDetectionsActive : demoDetectionsIdle;
  }, [enabled, fireTriggered]);

  const incidentOverride = useMemo<Partial<PredictResponse> | null>(() => {
    if (!enabled || !fireTriggered) return null;
    return {
      confidence: 0.92,
      spread_speed: {
        speed_m_per_min: 17.4,
        speed_km_per_h: 1.044,
        level: 'RAPIDE',
        description: 'Simulation demo',
        color: 'orange',
        factors: {
          V_base: 2,
          F_vent: 1.95,
          F_humidite: 0.42,
          F_temp: 1.28,
          F_saison: 1.3,
          F_pluie: 1,
        },
      },
    };
  }, [enabled, fireTriggered]);

  return {
    enabled,
    fireTriggered,
    countdownSeconds,
    statusOverride,
    detectionsOverride,
    incidentOverride,
  };
}
