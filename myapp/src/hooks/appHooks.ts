import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from '@/src/api/endpoints';
import { getDefaultApiBaseUrl, isLegacyLocalhostApiUrl, setApiBaseUrl } from '@/src/api/client';
import type { AlertLevel, PredictRequest, VisionAlert } from '@/src/api/types';
import { computeGlobalAlert } from '@/src/utils/alertPriority';

export function useStatusPoll(enabled = true, intervalMs = 30000) {
  return useQuery({ queryKey: ['status'], queryFn: api.status, refetchInterval: enabled ? intervalMs : false });
}

export function useSensorStatePoll(enabled = true, intervalMs = 2000) {
  return useQuery({
    queryKey: ['sensor-state'],
    queryFn: api.sensorState,
    refetchInterval: enabled ? intervalMs : false,
    enabled,
  });
}

export function usePredictPoll(payload: PredictRequest, enabled: boolean, intervalMs = 5000) {
  return useQuery({
    queryKey: ['predict', payload],
    queryFn: () => api.predict(payload),
    refetchInterval: enabled ? intervalMs : false,
    enabled,
  });
}

export function useVisionPoll(enabled: boolean) {
  return useQuery({
    queryKey: ['camera-detections'],
    queryFn: api.cameraDetections,
    refetchInterval: enabled ? 600 : false,
    enabled,
    retry: 1,
  });
}

export function useGlobalAlert(sensorAlert: AlertLevel, visionAlert: VisionAlert) {
  return useMemo(() => computeGlobalAlert(sensorAlert, visionAlert), [sensorAlert, visionAlert]);
}

export function useNotificationConfig() {
  const load = useQuery({ queryKey: ['ntfy-config'], queryFn: api.ntfyConfigGet });
  const save = useMutation({ mutationFn: api.ntfyConfig });
  const test = useMutation({ mutationFn: api.ntfyTest });
  return { load, save, test };
}

const SETTINGS_KEY = 'alassas-settings';

export type AppSettings = {
  soundEnabled: boolean;
  apiBaseUrl: string;
  demoMode: boolean;
};

const defaultSettings: AppSettings = {
  soundEnabled: true,
  apiBaseUrl: getDefaultApiBaseUrl(),
  demoMode: false,
};

export function useSettings() {
  const load = useQuery({
    queryKey: ['local-settings'],
    queryFn: async () => {
      const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()?.replace(/\/+$/, '');
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(SETTINGS_KEY);
      } catch {
        raw = null;
      }

      let parsed = defaultSettings;
      if (raw) {
        try {
          parsed = JSON.parse(raw) as AppSettings;

          if (envApiBaseUrl) {
            if (parsed.apiBaseUrl !== envApiBaseUrl) {
              parsed = { ...parsed, apiBaseUrl: envApiBaseUrl };
              try {
                await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
              } catch {
                // Keep in-memory migration even if storage update fails.
              }
            }
          } else if (
            parsed.apiBaseUrl &&
            isLegacyLocalhostApiUrl(parsed.apiBaseUrl) &&
            !isLegacyLocalhostApiUrl(defaultSettings.apiBaseUrl)
          ) {
            parsed = { ...parsed, apiBaseUrl: defaultSettings.apiBaseUrl };
            try {
              await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
            } catch {
              // Keep in-memory migration even if storage update fails.
            }
          }
        } catch {
          parsed = defaultSettings;
        }
      }

      parsed = {
        ...parsed,
        soundEnabled: true,
        demoMode: Boolean(parsed.demoMode),
      };

      setApiBaseUrl(parsed.apiBaseUrl);
      return parsed;
    },
  });

  const save = useMutation({
    mutationFn: async (settings: AppSettings) => {
      const normalized: AppSettings = {
        soundEnabled: true,
        apiBaseUrl: settings.apiBaseUrl || getDefaultApiBaseUrl(),
        demoMode: Boolean(settings.demoMode),
      };

      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
      } catch {
        // Persisting settings is best-effort; app should continue with in-memory state.
      }
      setApiBaseUrl(normalized.apiBaseUrl);
      return normalized;
    },
  });

  return { load, save };
}
