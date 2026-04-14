import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

const LEGACY_LOCALHOST_URLS = new Set(['http://localhost:5000', 'http://127.0.0.1:5000']);

function normalizeHost(host: string) {
  const cleaned = host.trim().toLowerCase();
  if (!cleaned) return '';
  if ((cleaned === 'localhost' || cleaned === '127.0.0.1') && process.env.EXPO_OS === 'android') {
    // Android emulator maps host loopback to 10.0.2.2.
    return '10.0.2.2';
  }
  return cleaned;
}

function parseHost(raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) return '';

  try {
    const withScheme = raw.includes('://') ? raw : `http://${raw}`;
    const parsed = new URL(withScheme);
    return normalizeHost(parsed.hostname);
  } catch {
    return '';
  }
}

function detectExpoHost() {
  const fromExpoConfig = parseHost(Constants.expoConfig?.hostUri);
  if (fromExpoConfig) return fromExpoConfig;

  const fromExpoGo = parseHost(Constants.expoGoConfig?.debuggerHost);
  if (fromExpoGo) return fromExpoGo;

  const fromScriptUrl = parseHost(NativeModules?.SourceCode?.scriptURL);
  if (fromScriptUrl) return fromScriptUrl;

  return '';
}

export function getDefaultApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');

  const host = detectExpoHost();
  if (host) return `http://${host}:5000`;

  return 'http://127.0.0.1:5000';
}

export function isLegacyLocalhostApiUrl(url: string) {
  return LEGACY_LOCALHOST_URLS.has(url.trim().toLowerCase());
}

let API_BASE_URL = getDefaultApiBaseUrl();
const DEFAULT_TIMEOUT = 6000;
const MAX_RETRIES = 3;

export function setApiBaseUrl(url: string) {
  API_BASE_URL = url.trim();
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  let lastError: unknown;
  for (let i = 0; i < MAX_RETRIES; i += 1) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error;
      if (i < MAX_RETRIES - 1) {
        await sleep(1000 * 2 ** i);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export async function jsonApi<T>(path: string, options: RequestInit = {}) {
  const response = await fetchWithRetry(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const json = await response.json().catch(() => {
    throw new Error('Server response format error');
  });

  if (!response.ok) {
    throw new Error((json?.error as string) ?? `HTTP ${response.status}`);
  }

  return json as T;
}
