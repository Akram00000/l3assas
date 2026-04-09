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

export function usePredictPoll(payload: PredictRequest, enabled: boolean) {
  return useQuery({
    queryKey: ['predict', payload],
    queryFn: () => api.predict(payload),
    refetchInterval: enabled ? 5000 : false,
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
};

const defaultSettings: AppSettings = {
  soundEnabled: true,
  apiBaseUrl: getDefaultApiBaseUrl(),
};

export function useSettings() {
  const load = useQuery({
    queryKey: ['local-settings'],
    queryFn: async () => {
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

          if (
            !process.env.EXPO_PUBLIC_API_BASE_URL &&
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

      setApiBaseUrl(parsed.apiBaseUrl);
      return parsed;
    },
  });

  const save = useMutation({
    mutationFn: async (settings: AppSettings) => {
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        // Persisting settings is best-effort; app should continue with in-memory state.
      }
      setApiBaseUrl(settings.apiBaseUrl);
      return settings;
    },
  });

  return { load, save };
}
