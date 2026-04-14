# FireGuard -> Expo Mobile App Build Report

Date: 2026-04-09
Project root: ./
Goal: Build an Expo mobile app for farmers with the same core functionality as the current dashboard, using the running Python server as backend API.

---

## 1) What Exists Today (Verified)

### 1.1 Code and assets in current project

- `server.py` (Flask API + ONNX inference + camera detection + ntfy integration)
- `dashboard.html` (web UI consuming API)
- `models_onnx/fire_weather_classifier.onnx`
- `models_onnx/smoke_gas_calibrated_classifier.onnx`
- `models_onnx/best.onnx` (fire/smoke vision model)
- `models_onnx/intruder_best.onnx` (person/animal vision model)
- `models_onnx/gas_risk_weights.json` (fusion thresholds, gates, class order, safe zone)

### 1.2 Runtime behavior summary

- Server starts on `0.0.0.0:5000`.
- CORS is enabled globally.
- Sensor pipeline runs via POST `/predict`.
- Camera can be started/stopped via API and streamed as MJPEG.
- Vision detections are available as JSON via polling endpoint.
- ntfy topic/server/cooldown can be configured at runtime.

---

## 2) Backend API Contract (Authoritative for Mobile)

Base URL pattern:

- Local dev from same machine: `http://localhost:5000`
- Physical phone on same Wi-Fi: `http://<YOUR_PC_LAN_IP>:5000`
- Android emulator: `http://10.0.2.2:5000`
- iOS simulator: `http://localhost:5000`

Content type:

- JSON endpoints use `application/json`.
- Camera stream endpoint returns `multipart/x-mixed-replace; boundary=frame`.

### 2.1 `GET /status`

Purpose:

- Health and capability check.

Response:

```json
{
  "online": true,
  "sensors_ok": true,
  "vision_ok": true,
  "camera_active": false,
  "model_mode": "onnx"
}
```

Field notes:

- `model_mode` for sensors can be `onnx` or `demo`.
- `sensors_ok` tells whether sensor ONNX models loaded.
- `vision_ok` tells whether vision ONNX models loaded.

### 2.2 `POST /predict`

Purpose:

- Main sensor prediction and spread-speed calculation.

Request body:

```json
{
  "mq2": 100,
  "mq6": 80,
  "temperature": 20,
  "rh": 60,
  "wind": 5,
  "rain": 0,
  "month_num": 7
}
```

Recommended client-side ranges (from dashboard controls):

- `mq2`: 0..1023
- `mq6`: 0..1023
- `temperature`: -10..50
- `rh`: 0..100
- `wind`: 0..80
- `rain`: 0..50 (step 0.5)
- `month_num`: 1..12

Success response shape:

```json
{
  "success": true,
  "alert": "SAFE",
  "smoke_prob": 0.05,
  "fire_risk_prob": 0.12,
  "gas_class": "NoGas",
  "class_proba": {
    "Mixture": 0.01,
    "NoGas": 0.96,
    "Perfume": 0.02,
    "Smoke": 0.01
  },
  "confidence": 0.88,
  "gates_applied": [],
  "safe_zone_applied": true,
  "model_mode": "onnx",
  "thresholds": {
    "smoke_fire": 0.4,
    "smoke_warning": 0.35,
    "risk_fire": 0.75,
    "risk_warning": 0.8
  },
  "spread_speed": {
    "speed_m_per_min": 1.8,
    "speed_km_per_h": 0.108,
    "level": "FAIBLE",
    "description": "Feu controlable a pied",
    "color": "green",
    "factors": {
      "V_base": 2.0,
      "F_vent": 1.11,
      "F_humidite": 0.33,
      "F_temp": 1.0,
      "F_saison": 1.0,
      "F_pluie": 0.7
    }
  }
}
```

Error response:

```json
{
  "success": false,
  "error": "<message>"
}
```

Important side effect:

- When `alert` is `FIRE` or `WARNING`, backend may send ntfy notifications (cooldown-protected).

### 2.3 `POST /camera/start`

Purpose:

- Start webcam capture and background detection loop.

Request body:

```json
{
  "cam_id": 0
}
```

Response (ok):

```json
{
  "ok": true,
  "msg": "Camera 0 demarree"
}
```

Response (error):

```json
{
  "ok": false,
  "error": "Impossible d'ouvrir la camera 0"
}
```

### 2.4 `POST /camera/stop`

Purpose:

- Stop webcam capture.

Response:

```json
{
  "ok": true
}
```

### 2.5 `POST /camera/config`

Purpose:

- Update runtime detection config.

Request body (any subset allowed):

```json
{
  "show_fire": true,
  "show_intruder": true,
  "conf_fire": 0.35,
  "conf_intruder": 0.35
}
```

Response:

```json
{
  "ok": true
}
```

### 2.6 `GET /camera/detections`

Purpose:

- Poll detection results as JSON for UI badges/cards.

Response:

```json
{
  "fire": [
    {
      "class_id": 1,
      "confidence": 0.93,
      "bbox": [120, 80, 260, 220]
    }
  ],
  "intruder": [
    {
      "class_id": 0,
      "confidence": 0.81,
      "bbox": [300, 120, 420, 340]
    }
  ],
  "summary": {
    "has_fire": true,
    "has_smoke": false,
    "has_person": true,
    "has_animal": false,
    "vision_alert": "FIRE"
  },
  "camera_active": true
}
```

Class mapping:

- `fire` list: `class_id=0` smoke, `class_id=1` fire
- `intruder` list: `class_id=0` person, `class_id=1` animal

### 2.7 `GET /camera/stream`

Purpose:

- Live MJPEG stream of annotated frames.

Response type:

- `multipart/x-mixed-replace; boundary=frame`

Mobile note:

- React Native `Image` does not reliably support MJPEG across platforms.
- Recommended approach in Expo is to render stream via `react-native-webview` using HTML `<img src=".../camera/stream"/>`.

### 2.8 `GET /ntfy/config`

Purpose:

- Read current ntfy server/topic/cooldown.

Response:

```json
{
  "topic": "fireguard-alerts",
  "server": "https://ntfy.sh",
  "cooldown": 60
}
```

### 2.9 `POST /ntfy/config`

Purpose:

- Update ntfy server/topic/cooldown.

Request body:

```json
{
  "topic": "my-farm-topic",
  "server": "https://ntfy.sh",
  "cooldown": 60
}
```

Response:

```json
{
  "ok": true,
  "topic": "my-farm-topic",
  "server": "https://ntfy.sh",
  "cooldown": 60
}
```

### 2.10 `POST /ntfy/test`

Purpose:

- Trigger a test ntfy notification, optionally with current camera frame attachment.

Response:

```json
{
  "ok": true,
  "msg": "Notification test envoyee sur <topic>"
}
```

---

## 3) Model and Decision Logic You Must Preserve

This section matters if you want mobile UI behavior to match web behavior exactly.

### 3.1 Sensor class order and risk weights

From `gas_risk_weights.json`:

- `class_order = [Mixture, NoGas, Perfume, Smoke]`
- `risk_weights = [0.95, 0.0, 0.02, 0.8]`
- `prob_clip_max = 0.85`

Derived smoke probability:

- `smoke_prob = min(dot(class_probs, risk_weights), prob_clip_max)`

### 3.2 Safe-zone override

If:

- `mq2 < 150` and `mq6 < 120`

Then force:

- `smoke_prob = 0.05`
- `gas_class = NoGas`
- `safe_zone_applied = true`

### 3.3 Weather risk model inputs (when ONNX is loaded)

Features built by backend include:

- `temperature, rh, wind, rain`
- `month_sin, month_cos`
- optional rolling and delta terms
- `temp/(rh+1)` ratio

### 3.4 Environmental gates

- Cold temp gate (<15 C) dampens fire risk.
- Weather-context gate dampens smoke when weather risk is low.
- High humidity gate dampens fire risk above RH threshold.

### 3.5 Alert fusion logic

Current backend fusion rules:

1. `FIRE` if `smoke_prob > smoke_fire` AND `fire_risk_prob > risk_fire`
2. `WARNING` if `smoke_prob > smoke_warning` OR `fire_risk_prob > risk_warning`
3. Else `SAFE`

### 3.6 Spread speed formula (Rothermel/McArthur style)

Backend computes:

- `V = 2.0`
- `F_vent = 1 + (wind/10)^1.5`
- `F_humidite = exp(-0.035 * rh)`
- `F_temp = 1 + 0.015 * max(0, temperature - 20)`
- `F_saison = 1.3 (Jun-Sep), 1.1 (May/Oct), else 1.0`
- `F_pluie = max(0.1, 1 - rain/5)`

Then:

- `speed_m_per_min = V * F_vent * F_humidite * F_temp * F_saison * F_pluie`

Level mapping:

- `<2`: FAIBLE
- `<8`: MODERE
- `<25`: RAPIDE
- `>=25`: EXTREME

---

## 4) Existing Dashboard Behaviors to Mirror in Mobile

### 4.1 Polling cadence used by web UI

- Health/status poll: every 30s
- Sensor predict poll: every 5s
- Vision detections poll when camera active: every 600ms

### 4.2 Global alert precedence

Use this exact order:

1. FIRE if sensor is FIRE or vision is FIRE
2. WARNING if sensor is WARNING or vision is SMOKE or INTRUSION
3. SAFE otherwise

### 4.3 Functional blocks currently present

- Sensor controls (MQ2, MQ6, temp, RH, wind, rain, month)
- Scenario presets (normal, gas leak, hot day, fire, extreme)
- Sensor alert card with confidence and class probabilities
- Vision alert card with counts for fire/smoke/person/animal
- Camera controls (start/stop, toggles, confidence sliders)
- Spread speed card and factor breakdown
- Gates panel (cold, humidity, low weather, safe zone)
- Event log feed
- ntfy config and ntfy test actions
- Theme toggle and sound alarm toggle

---

## 5) Expo Mobile Architecture Recommendation

### 5.1 Recommended stack

- Expo SDK (managed workflow)
- TypeScript
- `@tanstack/react-query` for API calls and polling
- `zod` for runtime response validation
- `react-native-webview` for MJPEG stream screen
- `react-native-svg` + chart lib (or lightweight custom chart)
- `expo-notifications` for local in-app alerts
- `expo-av` (optional) for fire alarm sound behavior
- `expo-secure-store` or `AsyncStorage` for server/topic settings

### 5.2 Suggested app navigation

- Home screen: global status, sensor summary, spread speed
- Sensors screen: input controls + presets + class probabilities + gates
- Camera screen: stream + detection counters + camera config
- Notifications screen: ntfy topic/server/cooldown + test button
- Events screen: timeline of sensor and vision events

### 5.3 Suggested project structure

```txt
src/
  api/
    client.ts
    endpoints.ts
    types.ts
    validators.ts
  config/
    env.ts
  features/
    status/
    sensors/
    vision/
    spread/
    notifications/
    events/
  hooks/
    useStatusPoll.ts
    usePredictPoll.ts
    useVisionPoll.ts
  store/
    uiStore.ts
  utils/
    network.ts
    alertPriority.ts
```

---

## 6) Type Contracts for Expo (Use As-Is)

```ts
export type ModelMode = 'onnx' | 'demo' | 'local';

export interface StatusResponse {
  online: boolean;
  sensors_ok: boolean;
  vision_ok: boolean;
  camera_active: boolean;
  model_mode: ModelMode;
}

export interface PredictRequest {
  mq2: number;
  mq6: number;
  temperature: number;
  rh: number;
  wind: number;
  rain: number;
  month_num: number;
}

export type AlertLevel = 'SAFE' | 'WARNING' | 'FIRE';

export interface ClassProba {
  Mixture?: number;
  NoGas?: number;
  Perfume?: number;
  Smoke?: number;
  [k: string]: number | undefined;
}

export interface GateApplied {
  name: 'cold_temp' | 'low_weather_risk' | 'high_humidity' | string;
  label: string;
}

export interface SpreadFactors {
  V_base: number;
  F_vent: number;
  F_humidite: number;
  F_temp: number;
  F_saison: number;
  F_pluie: number;
}

export interface SpreadSpeed {
  speed_m_per_min: number;
  speed_km_per_h?: number;
  level: 'FAIBLE' | 'MODERE' | 'RAPIDE' | 'EXTREME' | string;
  description: string;
  color: 'green' | 'amber' | 'orange' | 'red' | string;
  factors: SpreadFactors;
}

export interface PredictResponse {
  success: boolean;
  alert: AlertLevel;
  smoke_prob: number;
  fire_risk_prob: number;
  gas_class: string;
  class_proba: ClassProba;
  confidence: number;
  gates_applied: GateApplied[];
  safe_zone_applied: boolean;
  model_mode: ModelMode;
  thresholds: {
    smoke_fire: number;
    smoke_warning: number;
    risk_fire: number;
    risk_warning: number;
  };
  spread_speed: SpreadSpeed;
  error?: string;
}

export interface Detection {
  class_id: number;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface VisionSummary {
  has_fire: boolean;
  has_smoke: boolean;
  has_person: boolean;
  has_animal: boolean;
  vision_alert: 'FIRE' | 'SMOKE' | 'INTRUSION' | 'CLEAR';
}

export interface CameraDetectionsResponse {
  fire: Detection[];
  intruder: Detection[];
  summary: VisionSummary;
  camera_active: boolean;
}

export interface SimpleOk {
  ok: boolean;
  msg?: string;
  error?: string;
}

export interface NtfyConfig {
  topic: string;
  server: string;
  cooldown: number;
}
```

---

## 7) API Service Layer Pattern for Expo

```ts
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  status: () => json<StatusResponse>('/status'),
  predict: (payload: PredictRequest) =>
    json<PredictResponse>('/predict', { method: 'POST', body: JSON.stringify(payload) }),
  cameraStart: (cam_id = 0) =>
    json<SimpleOk>('/camera/start', { method: 'POST', body: JSON.stringify({ cam_id }) }),
  cameraStop: () => json<SimpleOk>('/camera/stop', { method: 'POST' }),
  cameraConfig: (cfg: Partial<{ show_fire: boolean; show_intruder: boolean; conf_fire: number; conf_intruder: number }>) =>
    json<SimpleOk>('/camera/config', { method: 'POST', body: JSON.stringify(cfg) }),
  cameraDetections: () => json<CameraDetectionsResponse>('/camera/detections'),
  ntfyConfigGet: () => json<NtfyConfig>('/ntfy/config'),
  ntfyConfigSet: (payload: Partial<NtfyConfig>) =>
    json<NtfyConfig & { ok: boolean }>('/ntfy/config', { method: 'POST', body: JSON.stringify(payload) }),
  ntfyTest: () => json<SimpleOk>('/ntfy/test', { method: 'POST' }),
  cameraStreamUrl: () => `${API_BASE}/camera/stream`,
};
```

---

## 8) Expo Networking and Device Connectivity Requirements

### 8.1 Critical localhost rule

On a physical phone, `localhost` points to the phone itself, not your PC.

Action:

- Set `EXPO_PUBLIC_API_BASE_URL=http://<PC_LAN_IP>:5000` when testing on real device.

### 8.2 app config for HTTP during development

If using plain `http://` in mobile builds, configure cleartext where needed.

Example `app.json` additions:

```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true
    },
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        }
      }
    }
  }
}
```

For production, prefer HTTPS and remove permissive settings.

### 8.3 Timeouts and retries

Recommended:

- `/status`: timeout 2-3s, retry with exponential backoff.
- `/predict`: timeout 3-5s.
- `/camera/detections`: timeout 1-2s during active camera polling.
- If 3 consecutive failures happen, show backend offline banner and pause heavy polling.

---

## 9) Camera Streaming in Expo: Practical Options

### Option A (fastest to implement): WebView-based MJPEG

- Use `react-native-webview`.
- Render minimal HTML containing `<img src="${api.cameraStreamUrl()}" />`.
- Pros: no backend changes.
- Cons: less native control, varying performance by device.

### Option B (best long-term): add snapshot endpoint in backend

Add a backend endpoint like `GET /camera/frame.jpg` returning last frame bytes.

Then mobile can:

- Display image with refresh strategy (1-4 fps for monitoring), or
- Use native image pipeline and avoid MJPEG parsing issues.

Recommendation:

- Start with Option A to ship quickly.
- Move to Option B if stream stability/performance is not acceptable.

---

## 10) Notification Strategy for Farmer App

### 10.1 Keep existing server-side ntfy alerts

Your backend already sends ntfy alerts for:

- Vision: FIRE, SMOKE, INTRUSION (cooldown-protected)
- Sensors: FIRE, WARNING (cooldown-protected)

### 10.2 Add in-app local alerting

In Expo app:

- Trigger local banner/sound when alert state transitions to higher severity.
- Keep audible alarm only for FIRE unless user opts in for WARNING.
- Respect same cooldown concept to avoid alarm fatigue.

### 10.3 User settings to expose

- Sound on/off
- Vibration on/off
- Poll interval profile (battery saver vs real-time)
- ntfy topic/server/cooldown editor

---

## 11) Exact Feature Mapping: Web -> Mobile

### Must-have parity (MVP)

1. Server status and capability badges (API/sensors/vision/camera state)
2. Sensor input controls and submit/poll predict
3. Sensor card with alert, confidence, class probabilities
4. Spread speed card with factors
5. Camera start/stop + fire/intruder toggles + confidence sliders
6. Vision summary counters and alert classification
7. ntfy config + ntfy test
8. Global alert strip with same precedence logic

### Nice-to-have parity (V2)

1. Weather history chart (mock or real feed)
2. Event timeline log
3. Theme toggle
4. Rich camera overlay badges

---

## 12) Implementation Phases (Suggested)

### Phase 1: Foundation (1-2 days)

- Create Expo TS app.
- Add env-based API base URL.
- Implement API client and types.
- Build status ping and backend connectivity diagnostics.

Exit criteria:

- App can call `/status` from simulator and real phone.

### Phase 2: Sensors + spread (2-3 days)

- Build sensor controls form.
- Implement `/predict` integration.
- Render alert card, probabilities, gates, spread factors.
- Add preset buttons.

Exit criteria:

- Same input values produce same visible alert category as dashboard.

### Phase 3: Vision + camera controls (2-4 days)

- Implement camera start/stop/config calls.
- Add detection polling (`/camera/detections`).
- Implement stream view (WebView first).
- Add vision counters and alert state.

Exit criteria:

- Camera can run end-to-end and detections update in near real time.

### Phase 4: Notifications + reliability (2-3 days)

- Build ntfy settings screen and test trigger.
- Add local in-app alert/sound behavior.
- Add offline mode UI, retry policy, and error banners.

Exit criteria:

- Farmer can configure and verify notification path from app.

### Phase 5: Hardening and release prep (2-4 days)

- Performance tuning (polling intervals, re-render optimization).
- Battery and background behavior checks.
- QA on low network quality.
- Build release checklist and docs.

Exit criteria:

- Stable on at least one Android device and one iOS device.

---

## 13) Testing Checklist (Functional + Integration)

### 13.1 API connectivity tests

- Backend reachable from phone via LAN IP.
- `/status` reflects model load state correctly.
- Errors shown cleanly when backend is down.

### 13.2 Sensor logic tests

- Safe zone inputs force low smoke and SAFE.
- Fire scenario yields `FIRE` alert.
- Weather/rh gates are visible when expected.
- Spread speed level changes across threshold boundaries.

### 13.3 Vision tests

- Start camera success and failure paths both handled.
- Detection counts map correctly:
  - fire class 1
  - smoke class 0
  - person class 0
  - animal class 1
- Vision alert mapping matches backend summary.

### 13.4 Notification tests

- ntfy config GET/POST roundtrip works.
- ntfy test sends message successfully.
- Repeated alerts respect cooldown behavior.

### 13.5 UX tests for farmer context

- Large readable typography in sunlight.
- Critical states are visible in <=1 second glance.
- Fire state provides clear action language.
- No accidental camera start/stop due to tiny controls.

---

## 14) Known Gaps and Risks

1. Backend prints dashboard URL but does not define a `/` route in Flask.
2. MJPEG in React Native is not universally smooth; WebView is workaround.
3. Webcam access occurs on backend machine, not phone camera. This is expected in your current architecture, but must be clearly explained to users.
4. No authentication on API; any device on same network can call endpoints.
5. HTTP (not HTTPS) is acceptable for local dev, not ideal for production.

Mitigations:

- Restrict network exposure in production (firewall/VPN).
- Add auth token at API gateway layer for remote deployments.
- Consider HTTPS reverse proxy (nginx/Caddy) if external access is required.

---

## 15) Recommended Next Technical Decisions

Decide these before coding screens in depth:

1. Camera stream strategy now: WebView MJPEG vs backend snapshot endpoint.
2. Desired deployment model:
   - local farm LAN only
   - cloud-hosted backend
3. Authentication requirement level (none/basic token/full auth).
4. Offline support expectation (read-only cached status vs full queued actions).
5. Notification ownership:
   - ntfy only
   - ntfy + Expo local alerts

---

## 16) Quick Start Commands

Backend start (from current project root):

```bash
pip install flask flask-cors onnxruntime opencv-python numpy
python server.py
```

Expo setup baseline:

```bash
npx create-expo-app fireguard-mobile -t expo-template-blank-typescript
cd fireguard-mobile
npm install @tanstack/react-query zod react-native-webview
npx expo start
```

Set your API base URL (example for physical device):

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:5000
```

---

## 17) Minimal Done Definition for Your Mobile MVP

MVP is done when all are true:

1. App can run on real phone and connect to backend over LAN.
2. Sensor controls call `/predict` and display alert + spread correctly.
3. Camera can start/stop and show detections + vision alert.
4. ntfy topic/server/cooldown can be edited in app and test sent.
5. Global alert logic matches current dashboard precedence.

---

## 18) Optional Backend Enhancements (Post-MVP)

1. Add `GET /camera/frame.jpg` for mobile-friendly frame refresh.
2. Add websocket endpoint for detections to replace 600ms polling.
3. Add `/health/deep` endpoint returning model filenames and load errors.
4. Add API key auth for remote deployments.
5. Add structured event history endpoint for persistent logs.

---

This report is designed to be directly actionable for Expo implementation while preserving existing FireGuard behavior and backend contracts.
