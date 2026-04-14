# Al Assas - FireGuard Platform

Comprehensive wildfire and intrusion monitoring platform that combines:
- A mobile operations app built with Expo/React Native
- A Flask backend for sensor fusion, camera inference, and alerting
- ONNX models for gas/weather risk scoring and vision detection

This repository now contains the full project workspace (mobile + backend + models + diagnostics), not only the mobile app subfolder.

## Project Layout

```text
prototype/
|- server.py                    # Unified backend API + camera stream + notifications
|- dashboard.html               # Local dashboard served by Flask
|- models_onnx/                 # ONNX models and risk configuration
|- myapp/                       # Main production Expo mobile app
|- backend-debug-app/           # Lightweight Expo app to test backend connectivity
|- requirements.txt             # Backend Python dependencies
|- README.md
```

## Architecture

- Backend ([server.py](server.py))
  - Sensor inference pipeline (MQ2/MQ6 + weather)
  - Fire spread estimation (Rothermel/McArthur-style factors)
  - Camera detection pipeline (fire/smoke + intrusion)
  - MJPEG stream endpoint for real-time annotated camera feed
  - Alert dispatch through Expo Push, with ntfy fallback

- Main mobile app ([myapp](myapp))
  - Expo Router + React Native UI
  - Live backend health integration (`/status`)
  - Sensor and camera monitoring views
  - Push notification registration and alert UX

- Debug mobile app ([backend-debug-app](backend-debug-app))
  - Network diagnostics and endpoint probes from real devices/APKs

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+
- Expo CLI (installed through npm scripts)
- A webcam (optional, for vision endpoints)

## Quick Start

### 1. Start backend

```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python server.py
```

Backend is available on:
- `http://localhost:5000`
- `http://<your-lan-ip>:5000` (for physical mobile devices)

### 2. Start main mobile app

```bash
cd myapp
npm install
npm start
```

By default, the app auto-detects host when possible. For physical device testing or standalone builds, set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:5000
```

### 3. (Optional) Start backend debug app

```bash
cd backend-debug-app
npm install
npm start
```

Use this app to probe backend routes (`/status`, `/sensors/state`, `/camera/detections`) from a device.

## API Surface (Backend)

Core endpoints exposed by [server.py](server.py):
- `GET /status`
- `GET|POST /sensors/state`
- `POST /predict`
- `POST /camera/start`
- `POST /camera/stop`
- `POST /camera/config`
- `GET /camera/detections`
- `GET /camera/stream`
- `GET|POST /ntfy/config`
- `POST /mobile/notify/register`
- `POST /mobile/notify/unregister`
- `GET /mobile/notify/status`
- `POST /mobile/notify/test`
- `POST /ntfy/test`

## Notifications

The backend supports two channels:
- Expo Push (primary) for registered mobile tokens
- ntfy (`https://ntfy.sh`) as fallback

Runtime token state is stored in `mobile_push_tokens.json` locally and intentionally excluded from Git.

## Development Notes

- ONNX model files in [models_onnx](models_onnx) are required for full inference mode.
- If ONNX dependencies/models are unavailable, sensor or vision paths may degrade to demo/limited behavior.
- Build artifacts (APK outputs, unpacked APK inspection folders, node_modules, virtual environments) are excluded from version control.

## Troubleshooting

- Android emulator loopback: use `http://10.0.2.2:5000` when needed.
- Physical phone cannot reach backend:
  - Ensure backend runs with `host='0.0.0.0'` (already configured)
  - Use your machine LAN IP in `EXPO_PUBLIC_API_BASE_URL`
  - Confirm firewall allows inbound TCP 5000

## Repository Goal

This monorepo is designed to keep mobile, backend, and ML assets versioned together so release builds and backend behavior stay in sync.
