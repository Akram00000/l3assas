# FireGuard App MDR Report

- Report type: MDR (Monitoring, Detection, and Response) technical report
- Project: FireGuard v5 / "al-assas"
- Generated on: 2026-04-09
- Report scope: backend API (`server.py`), web dashboard (`dashboard.html`), Expo mobile app (`myapp`)

## 1. Executive Summary

FireGuard is a unified incident monitoring platform combining:
- Sensor-based wildfire risk prediction (MQ2, MQ6, weather features)
- Camera-based visual detection (fire, smoke, intrusion)
- Spread-speed estimation
- Multi-channel alerting (mobile push via Expo and fallback via ntfy)

Current implementation status:
- Core detection, fusion, and alert pipeline is functional
- Shared sensor state synchronization between dashboard and mobile is implemented
- Global alert is now backend-driven and auto-refreshed to mobile clients
- Mobile push token registration and persistence exist on backend
- Fallback notification channel (ntfy) is active when mobile push is unavailable

Operational caveat:
- Expo Go cannot deliver remote push notifications for closed-app scenarios in SDK 53+
- Closed-app push requires development or production builds

## 2. Scope and Methodology

This report is based on static and runtime review of:
- Backend service logic and routes in `server.py`
- Dashboard UI, polling, and API integration in `dashboard.html`
- Mobile app architecture, hooks, screens, and API client in `myapp`
- Observed runtime behavior from API calls, lint checks, and backend status responses

Out of scope:
- Cloud deployment hardening
- Penetration testing
- Infrastructure-as-code validation

## 3. High-Level Architecture

## 3.1 System Components

- Backend API server (Flask): `server.py`
- ONNX models: `models_onnx/`
- Browser dashboard: `dashboard.html`
- Mobile app (React Native + Expo Router): `myapp/`
- Notification providers:
  - Primary: Expo Push API
  - Fallback: ntfy server/topic

## 3.2 Data Planes

- Sensor plane:
  - Inputs: MQ2, MQ6, temperature, humidity (rh), wind, rain, month
  - Endpoint: `/predict`
  - Output: alert level, confidence, spread speed, gate decisions

- Vision plane:
  - Inputs: camera stream frames
  - Endpoints: `/camera/start`, `/camera/detections`, `/camera/stream`
  - Output: per-class detections and `vision_alert`

- Fusion plane:
  - Backend maintains live `sensor_alert`, `vision_alert`, `global_alert`
  - Endpoint `/status` publishes fused alert state for clients

## 3.3 Notification Plane

- Sensor and vision non-safe states trigger notification path
- Backend attempts mobile push first, then falls back to ntfy
- Token persistence supports restart continuity

## 4. Backend Deep Dive (`server.py`)

## 4.1 Core Runtime Capabilities

- Loads ONNX models when available
- Falls back to demo logic for sensors when model files/runtime are absent
- Runs threaded camera loop with detection and MJPEG stream generation
- Computes spread-speed level and factors from weather conditions

## 4.2 Sensor Pipeline

Main function:
- `run_sensor_pipeline(mq2, mq6, temperature, rh, wind, rain, month_num, ...)`

Outputs include:
- `alert` (`SAFE` | `WARNING` | `FIRE`)
- `smoke_prob`
- `fire_risk_prob`
- `gas_class`
- `confidence`
- `gates_applied`
- `model_mode`
- `thresholds`

Spread model:
- `compute_spread(...)` returns speed and severity level (`FAIBLE`, `MODERE`, `RAPIDE`, `EXTREME`)

## 4.3 Vision Pipeline

- Camera loop reads frames and runs two ONNX sessions:
  - fire/smoke model (`best.onnx`)
  - intrusion model (`intruder_best.onnx`)
- Detections are post-processed via NMS and annotated
- Detection summaries are surfaced by `/camera/detections`

## 4.4 Shared State and Synchronization

Backend state objects:
- `sensor_state` with lock
- `alert_state` with lock

State updates:
- `/predict` updates `sensor_state` and `sensor_alert`
- Camera loop and `/camera/detections` update `vision_alert`
- `global_alert` is recomputed server-side

## 4.5 Notification Subsystem

Providers:
- Expo Push API (`https://exp.host/--/api/v2/push/send`)
- ntfy fallback (`NTFY_SERVER`, `NTFY_TOPIC`)

Behavior:
- If push token delivery is successful: mobile notification path used
- If push is disabled/unavailable/fails: ntfy fallback is sent

Anti-spam:
- Cooldown guard by alert class (`NTFY_COOLDOWN`, `_can_notify`)

Token lifecycle:
- Register/unregister endpoints
- Tokens persisted in `mobile_push_tokens.json`
- Tokens loaded at startup
- Stale Expo tokens removed on `DeviceNotRegistered`

## 4.6 API Surface (Backend)

### System
- `GET /`
  - Serves dashboard HTML

- `GET /status`
  - Health and live state payload
  - Includes: `online`, `sensors_ok`, `vision_ok`, `camera_active`, `model_mode`
  - Includes alert fields: `sensor_alert`, `vision_alert`, `global_alert`, `alert_updated_at`
  - Includes `mobile_push_devices`

### Sensors
- `GET /sensors/state`
  - Returns shared sensor state snapshot

- `POST /sensors/state`
  - Updates shared sensor state from payload

- `POST /predict`
  - Computes prediction and spread from shared state (updated by request payload)
  - Triggers sensor notifications when alert is non-safe

### Camera
- `POST /camera/start`
- `POST /camera/stop`
- `POST /camera/config`
- `GET /camera/detections`
- `GET /camera/stream`

### Notifications
- `GET /ntfy/config`
- `POST /ntfy/config`
- `POST /ntfy/test`

- `POST /mobile/notify/register`
- `POST /mobile/notify/unregister`
- `GET /mobile/notify/status`
- `POST /mobile/notify/test`

## 5. Web Dashboard Deep Dive (`dashboard.html`)

## 5.1 Role

Dashboard acts as:
- Operational control panel for sensors and camera
- Visualization console for alert states, detections, and spread metrics
- Notification configuration UI for ntfy

## 5.2 Runtime Behavior

Observed polling logic:
- API health/status check every ~2s
- Sensor update cycle every ~5s
- Camera detections polling every ~600ms when active

Sensor interaction:
- Slider values build a payload and call `/predict`
- Results update sensor card and global alert UI

Camera interaction:
- Starts/stops camera through backend routes
- Displays MJPEG stream from `/camera/stream`
- Overlays detection badges and updates vision alert card

## 5.3 Notification Control

- Supports ntfy topic/server/cooldown update from UI
- Supports test notification trigger

## 6. Mobile App Deep Dive (`myapp`)

## 6.1 Stack

- Expo SDK 54 + React Native 0.81
- Expo Router tabs
- React Query for polling and cache orchestration
- AsyncStorage for settings persistence
- Optional expo-notifications runtime path (non-Expo-Go)

## 6.2 App Shell and Providers

Root layers:
- QueryClientProvider
- Theme provider
- Language provider
- Startup splash overlay and tab stack

Push registration integration:
- `useMobilePushRegistration()` runs at app root
- Uses lazy import and Expo Go guard to avoid runtime crash in Expo Go

## 6.3 Tabs and Screen Behavior

### Home (`app/(tabs)/index.tsx`)
- Polls `/status` at 1.5s
- Polls vision detections when camera is active
- Global alert source:
  - primary: backend `status.global_alert`
  - fallback: local fusion from status/vision fields
- Displays server/sensors/vision/camera status badges

### Sensors (`app/(tabs)/sensors.tsx`)
- Polls `/sensors/state` at 1.5s
- Polls `/predict` at 1.5s with live payload derived from shared sensor state
- Pull-to-refresh explicitly refetches sensor state and prediction
- Shows alert, confidence, gas class, smoke/fire metrics, gates, and spread

### Camera (`app/(tabs)/camera.tsx`)
- Polls `/status` at 1.5s
- Polls `/camera/detections` at 600ms when active
- Starts/stops backend camera
- Renders `/camera/stream` in WebView

### Settings (`app/(tabs)/settings.tsx`)
- Language switcher (Arabic/French)
- Theme toggle
- Sound toggle
- Configurable API base URL with persistence

## 6.4 API Client Reliability

- Dynamic API host detection from Expo runtime metadata
- Android localhost remap support for emulator (`10.0.2.2`)
- Request timeout: 3s
- Retry strategy: up to 3 attempts with backoff

## 7. Alerting and Fusion Logic

## 7.1 Severity Fusion

Backend and frontend both use the same precedence model:
- `FIRE` if sensor alert is `FIRE` OR vision alert is `FIRE`
- `WARNING` if sensor alert is `WARNING` OR vision alert in (`SMOKE`, `INTRUSION`)
- else `SAFE`

## 7.2 Trigger Conditions

Sensor alerts:
- Notification when `/predict` yields `WARNING` or `FIRE`

Vision alerts:
- Notification when detections include fire, smoke, or intrusion signatures

## 7.3 Delivery Path

1. Attempt Expo Push to registered tokens
2. If delivery unavailable/fails, send ntfy fallback

## 8. Notification Capability Matrix

- App open in foreground:
  - Development/production build: supported via expo-notifications
  - Expo Go: limited for remote push

- App background/closed remote push:
  - Development/production build: supported
  - Expo Go: not supported (SDK 53+ behavior)

- ntfy fallback:
  - Works independently of Expo runtime if user is subscribed in ntfy client

## 9. Data, Privacy, and Security Considerations

Current implementation notes:
- No auth/authz on API routes
- Notification tokens stored in local JSON file (`mobile_push_tokens.json`)
- No at-rest encryption for token file
- Camera stream endpoint is publicly reachable on bound interface
- CORS is globally enabled

Recommended controls:
- Add API key or JWT auth for mutable routes
- Restrict camera endpoints and notification config routes
- Encrypt token store or migrate to secure KV/DB
- Add rate limiting and request logging with rotation
- Validate payload ranges and schema at API boundary

## 10. Operational Readiness

## 10.1 Strengths

- Unified backend with clear route segmentation
- Shared state synchronization between web and mobile
- Backend-driven global alert consistency
- Multi-channel notification with fallback
- Reasonable client polling intervals for near-real-time UX

## 10.2 Current Risks

- Flask dev server is not production-grade
- Model runtime dependencies can fail silently into demo mode if not monitored
- Notification delivery observability is basic (console logs)
- No authentication on control endpoints

## 10.3 Recommended Production Baseline

- Serve Flask app via Gunicorn/Uvicorn behind reverse proxy
- Add health/readiness endpoints and structured logs
- Add persistence layer for alerts/events and token metadata
- Add environment-based config management (secrets, URLs, cooldown)
- Add TLS and origin restrictions

## 11. QA and Validation Summary

Observed validation outcomes:
- Frontend lint checks pass (`expo lint`)
- Python syntax compile check passes (`py_compile`)
- Status endpoint returns live fused alert fields
- Sensor-triggered transitions (`FIRE` -> `SAFE`) are reflected in `/status`
- Mobile notify endpoints respond and token persistence file exists

Recommended additional tests:
- Camera non-safe event end-to-end notification test
- Token stale-removal path (DeviceNotRegistered simulation)
- Network failure scenarios (timeout/retry behavior)
- Long-duration polling stability and memory profile
- Concurrent dashboard+mobile update contention tests

## 12. Runbook (Quick Ops)

Backend (root folder):
- `c:/python314/python.exe c:/Users/benam/OneDrive/Desktop/prototype/prototype/server.py`

Mobile (myapp folder):
- `npm start -c`

Key checks:
- `GET /status`
- `GET /sensors/state`
- `GET /camera/detections`
- `GET /mobile/notify/status`

Test sensor alert path:
- `POST /predict` with high-risk payload

Test notification route:
- `POST /mobile/notify/test`
- `POST /ntfy/test`

## 13. Roadmap Recommendations

Priority 1:
- Add authentication and route protection
- Add persistent event history API (`/alerts/history`)
- Add delivery receipts/tracking for notifications

Priority 2:
- Replace JSON token store with durable datastore
- Introduce configurable polling profiles per screen
- Add in-app diagnostics panel (status, token state, last alerts)

Priority 3:
- Add role-based dashboard controls
- Add exportable incident report generation
- Add cloud deployment templates and CI quality gates

## 14. Final Assessment

FireGuard is currently a strong functional prototype with:
- Working multi-modal detection
- Real-time mobile/dashboard synchronization
- Reliable fallback notification strategy
- Improved global alert consistency via backend fusion

To move from prototype to production-ready MDR posture, the next critical steps are:
- security hardening,
- operational observability,
- production deployment architecture,
- and closed-app push deployment through non-Expo-Go builds.
