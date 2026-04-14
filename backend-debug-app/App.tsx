import * as Network from 'expo-network';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

type ProbeResult = {
  id: string;
  timestamp: string;
  endpoint: string;
  ok: boolean;
  status: number | null;
  elapsedMs: number;
  message: string;
  responseSnippet: string;
};

type NetworkSnapshot = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
  ipAddress: string;
};

const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://172.21.1.247:5000';

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function safeSnippet(value: unknown) {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return raw.length > 600 ? `${raw.slice(0, 600)}...(truncated)` : raw;
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json,text/plain,*/*' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function App() {
  const [baseUrlInput, setBaseUrlInput] = useState(DEFAULT_BASE_URL);
  const [network, setNetwork] = useState<NetworkSnapshot>({
    isConnected: null,
    isInternetReachable: null,
    type: 'unknown',
    ipAddress: '--',
  });
  const [monitorMode, setMonitorMode] = useState(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const monitorTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedBaseUrl = useMemo(() => normalizeBaseUrl(baseUrlInput), [baseUrlInput]);
  const latest = results[0];

  const refreshNetworkSnapshot = async () => {
    try {
      const net = await Network.getNetworkStateAsync();
      const ipAddress = await Network.getIpAddressAsync().catch(() => '--');
      setNetwork({
        isConnected: net.isConnected ?? null,
        isInternetReachable: net.isInternetReachable ?? null,
        type: net.type ?? 'unknown',
        ipAddress,
      });
    } catch {
      setNetwork((prev) => ({ ...prev, ipAddress: '--' }));
    }
  };

  const appendResult = (entry: ProbeResult) => {
    setResults((prev) => [entry, ...prev].slice(0, 80));
  };

  const runProbe = async (endpoint: string) => {
    const startedAt = Date.now();
    const fullUrl = `${normalizedBaseUrl}${endpoint}`;
    try {
      const response = await fetchWithTimeout(fullUrl, 8000);
      const elapsedMs = Date.now() - startedAt;
      const contentType = response.headers.get('content-type') || '';
      const parsedBody = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');
      const ok = response.ok;
      appendResult({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        endpoint,
        ok,
        status: response.status,
        elapsedMs,
        message: ok ? 'request-ok' : 'http-error',
        responseSnippet: safeSnippet(parsedBody),
      });
      return ok;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'unknown-error';
      appendResult({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        endpoint,
        ok: false,
        status: null,
        elapsedMs,
        message,
        responseSnippet: '',
      });
      return false;
    }
  };

  const runQuickSuite = async () => {
    setPending(true);
    await refreshNetworkSnapshot();
    await runProbe('/status');
    await runProbe('/sensors/state');
    await runProbe('/camera/detections');
    setPending(false);
  };

  useEffect(() => {
    void refreshNetworkSnapshot();
  }, []);

  useEffect(() => {
    if (!monitorMode) {
      if (monitorTimer.current) {
        clearInterval(monitorTimer.current);
        monitorTimer.current = null;
      }
      return;
    }

    if (monitorTimer.current) {
      clearInterval(monitorTimer.current);
    }

    monitorTimer.current = setInterval(() => {
      void runProbe('/status');
    }, 2500);

    return () => {
      if (monitorTimer.current) {
        clearInterval(monitorTimer.current);
        monitorTimer.current = null;
      }
    };
  }, [monitorMode, normalizedBaseUrl]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Backend Debugger</Text>
        <Text style={styles.subTitle}>Minimal app to validate backend connectivity from APK.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>API Base URL</Text>
          <TextInput
            style={styles.input}
            value={baseUrlInput}
            onChangeText={setBaseUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://host:5000"
          />
          <Text style={styles.small}>Normalized: {normalizedBaseUrl}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Runtime Info</Text>
          <Text style={styles.small}>Platform: {Platform.OS}</Text>
          <Text style={styles.small}>Network Type: {network.type}</Text>
          <Text style={styles.small}>isConnected: {String(network.isConnected)}</Text>
          <Text style={styles.small}>isInternetReachable: {String(network.isInternetReachable)}</Text>
          <Text style={styles.small}>Device IP: {network.ipAddress}</Text>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.button} onPress={() => void runProbe('/status')} disabled={pending}>
            <Text style={styles.buttonText}>Probe /status</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => void runQuickSuite()} disabled={pending}>
            <Text style={styles.buttonText}>Run Full Check</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Monitor /status every 2.5s</Text>
            <Switch value={monitorMode} onValueChange={setMonitorMode} />
          </View>
          <Pressable style={styles.secondaryButton} onPress={() => void refreshNetworkSnapshot()}>
            <Text style={styles.secondaryButtonText}>Refresh Network Snapshot</Text>
          </Pressable>
        </View>

        {pending && (
          <View style={styles.pendingRow}>
            <ActivityIndicator />
            <Text style={styles.small}>Running probes...</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Latest Result</Text>
          {latest ? (
            <>
              <Text style={styles.small}>Time: {latest.timestamp}</Text>
              <Text style={styles.small}>Endpoint: {latest.endpoint}</Text>
              <Text style={styles.small}>Status: {latest.status ?? 'network-failure'}</Text>
              <Text style={styles.small}>Elapsed: {latest.elapsedMs} ms</Text>
              <Text style={[styles.small, latest.ok ? styles.ok : styles.fail]}>Result: {latest.ok ? 'OK' : 'FAILED'} ({latest.message})</Text>
              <Text style={styles.response}>{latest.responseSnippet || '--'}</Text>
            </>
          ) : (
            <Text style={styles.small}>No probes run yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>History ({results.length})</Text>
            <Pressable onPress={() => setResults([])}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          </View>
          {results.length === 0 && <Text style={styles.small}>No history.</Text>}
          {results.map((entry) => (
            <View key={entry.id} style={styles.logItem}>
              <Text style={[styles.logHead, entry.ok ? styles.ok : styles.fail]}>
                [{entry.timestamp}] {entry.endpoint} {'->'} {entry.status ?? 'NETWORK'} ({entry.elapsedMs}ms)
              </Text>
              <Text style={styles.small}>{entry.message}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: -4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbe5f0',
    gap: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  small: {
    fontSize: 13,
    color: '#334155',
  },
  response: {
    marginTop: 4,
    fontSize: 12,
    color: '#1f2937',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 2,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  ok: {
    color: '#166534',
  },
  fail: {
    color: '#b91c1c',
  },
  logItem: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    marginTop: 6,
  },
  logHead: {
    fontSize: 12,
    fontWeight: '700',
  },
  clear: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
});
