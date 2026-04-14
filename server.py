"""
FireGuard v5 — Serveur unifié
==============================
Combine :
  1. Détection capteurs (MQ2/MQ6 + météo) via modèles ONNX gas/weather
  2. Détection visuelle caméra (feu/fumée + intrusion) via YOLOv8/v12 ONNX
  3. Calcul vitesse de propagation (Rothermel/McArthur)
  4. Streaming MJPEG du flux caméra annoté en temps réel

Structure attendue :
    ton_dossier/
    ├── server.py
    ├── dashboard.html
    └── models_onnx/
        ├── fire_weather_classifier.onnx
        ├── smoke_gas_calibrated_classifier.onnx
        ├── gas_risk_weights.json
        ├── best.onnx            ← YOLOv12 feu/fumée caméra
        └── intruder_best.onnx   ← YOLOv8  intrusion caméra

Lancement :
    pip install flask flask-cors onnxruntime opencv-python numpy
    python server.py
"""

import os, json, math, time, threading, base64, io
import numpy as np
import cv2
import urllib.request
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION NTFY.SH — modifiez ces valeurs
# ─────────────────────────────────────────────────────────────────────────────
NTFY_SERVER  = "https://ntfy.sh"          # ou votre serveur auto-hébergé
NTFY_TOPIC   = "fireguard-alerts"         # ← CHANGEZ ce nom de topic (unique)
NTFY_COOLDOWN = 60                        # secondes entre deux notifications du même type

# Canal mobile principal (Expo Push). Si indisponible, fallback automatique vers ntfy.
EXPO_PUSH_ENABLED = True
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
MOBILE_PUSH_STORE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mobile_push_tokens.json')

# État anti-spam notifications
_ntfy_last = {'FIRE': 0, 'SMOKE': 0, 'INTRUSION': 0, 'SENSOR_FIRE': 0, 'SENSOR_WARNING': 0}
_ntfy_lock = threading.Lock()

# Tokens Expo Push enregistrés par les appareils mobiles.
mobile_push_lock = threading.Lock()
mobile_push_tokens = {}

def _can_notify(alert_type: str) -> bool:
    """Retourne True si le cooldown est écoulé pour ce type d'alerte."""
    now = time.time()
    with _ntfy_lock:
        if now - _ntfy_last.get(alert_type, 0) >= NTFY_COOLDOWN:
            _ntfy_last[alert_type] = now
            return True
    return False

def send_ntfy(title: str, message: str, priority: str = "urgent",
              tags: list = None, image_jpg: bytes = None):
    """
    Envoie une notification via ntfy.sh.
    Si image_jpg est fourni (bytes JPEG), il est joint en pièce attachée.
    Les valeurs non-ASCII passent en query string pour éviter l'erreur
    "Invalid header value" avec urllib.
    """
    import urllib.parse
    topic = NTFY_TOPIC
    # Encode les valeurs unicode en query params (ntfy les supporte)
    params = urllib.parse.urlencode({
        "title":    title,
        "message":  message,
        "priority": priority,
        "tags":     ",".join(tags or []),
    })
    url = f"{NTFY_SERVER}/{topic}?{params}"

    try:
        if image_jpg:
            # Corps = image JPEG, meta via query string
            headers = {
                "Content-Type": "image/jpeg",
                "Filename":     "capture.jpg",
            }
            req = urllib.request.Request(url, data=image_jpg,
                                         headers=headers, method="POST")
        else:
            headers = {"Content-Type": "text/plain; charset=utf-8"}
            req = urllib.request.Request(url, data=b"",
                                         headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=6) as resp:
            code = resp.getcode()
            print(f"📱 ntfy envoyé [{code}] → {title}")
    except Exception as e:
        print(f"⚠️  ntfy erreur : {e}")

def _is_expo_push_token(token: str) -> bool:
    return isinstance(token, str) and (
        token.startswith('ExponentPushToken[') or token.startswith('ExpoPushToken[')
    ) and token.endswith(']')

def _persist_mobile_push_tokens():
    with mobile_push_lock:
        snapshot = dict(mobile_push_tokens)

    try:
        with open(MOBILE_PUSH_STORE, 'w', encoding='utf-8') as f:
            json.dump(snapshot, f, ensure_ascii=True)
    except Exception as e:
        print(f"⚠️  sauvegarde tokens mobile impossible : {e}")

def _load_mobile_push_tokens():
    if not os.path.exists(MOBILE_PUSH_STORE):
        return

    try:
        with open(MOBILE_PUSH_STORE, 'r', encoding='utf-8') as f:
            raw = json.load(f)
    except Exception as e:
        print(f"⚠️  chargement tokens mobile impossible : {e}")
        return

    if not isinstance(raw, dict):
        return

    now = time.time()
    cleaned = {}
    for token, meta in raw.items():
        if not _is_expo_push_token(token):
            continue

        platform = 'unknown'
        updated_at = now
        if isinstance(meta, dict):
            platform = str(meta.get('platform', 'unknown'))[:32] or 'unknown'
            try:
                updated_at = float(meta.get('updated_at', now))
            except Exception:
                updated_at = now

        cleaned[token] = {
            'platform': platform,
            'updated_at': updated_at,
        }

    with mobile_push_lock:
        mobile_push_tokens.clear()
        mobile_push_tokens.update(cleaned)

    if cleaned:
        print(f"📲 Tokens mobile chargés : {len(cleaned)}")

def _register_mobile_push_token(token: str, platform: str = 'unknown') -> int:
    with mobile_push_lock:
        mobile_push_tokens[token] = {
            'platform': platform,
            'updated_at': time.time(),
        }
        count = len(mobile_push_tokens)

    _persist_mobile_push_tokens()
    return count

def _unregister_mobile_push_token(token: str):
    with mobile_push_lock:
        removed = mobile_push_tokens.pop(token, None) is not None
        count = len(mobile_push_tokens)

    if removed:
        _persist_mobile_push_tokens()
    return removed, count

def _snapshot_mobile_push_tokens():
    with mobile_push_lock:
        return list(mobile_push_tokens.keys())

def _mask_push_token(token: str) -> str:
    if len(token) <= 20:
        return token
    return f"{token[:12]}...{token[-8:]}"

_load_mobile_push_tokens()

def send_expo_push(title: str, message: str, data: dict = None, sound: str = 'default'):
    if not EXPO_PUSH_ENABLED:
        return False, 'expo_disabled'

    tokens = _snapshot_mobile_push_tokens()
    if not tokens:
        return False, 'no_registered_mobile_device'

    payload = []
    for token in tokens:
        payload.append({
            'to': token,
            'title': title,
            'body': message,
            'sound': sound,
            'priority': 'high',
            'channelId': 'default',
            'data': data or {},
        })

    req = urllib.request.Request(
        EXPO_PUSH_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            status_code = resp.getcode()
            body = resp.read().decode('utf-8', errors='replace')

        if status_code < 200 or status_code >= 300:
            return False, f'expo_http_{status_code}'

        parsed = json.loads(body) if body else {}
        rows = parsed.get('data', []) if isinstance(parsed, dict) else []

        ok_count = 0
        stale_tokens = []
        for idx, row in enumerate(rows):
            if isinstance(row, dict) and row.get('status') == 'ok':
                ok_count += 1
                continue

            details = row.get('details') if isinstance(row, dict) else {}
            expo_error = details.get('error') if isinstance(details, dict) else None
            if expo_error == 'DeviceNotRegistered' and idx < len(tokens):
                stale_tokens.append(tokens[idx])

        if stale_tokens:
            with mobile_push_lock:
                for token in stale_tokens:
                    mobile_push_tokens.pop(token, None)
            _persist_mobile_push_tokens()

        if ok_count > 0:
            return True, f'expo_sent_{ok_count}_of_{len(tokens)}'
        return False, 'expo_no_success_receipt'
    except Exception as e:
        return False, str(e)

def send_alert_notification(title: str, message: str, priority: str = 'urgent',
                            tags: list = None, image_jpg: bytes = None, data: dict = None):
    mobile_sent, reason = send_expo_push(title, message, data=data)
    if mobile_sent:
        print(f"📲 mobile push envoyé → {title}")
        return

    print(f"ℹ️  mobile push indisponible ({reason}) — fallback ntfy")
    send_ntfy(title, message, priority, tags, image_jpg)

def _grab_frame_jpg() -> bytes | None:
    """Récupère la dernière frame JPEG de la caméra (ou None)."""
    with camera_state['lock']:
        return camera_state.get('frame_jpg')

def notify_vision_alert(alert_type: str, detections: dict):
    """
    Construit et envoie la notification ntfy pour une alerte caméra.
    alert_type : 'FIRE' | 'SMOKE' | 'INTRUSION'
    """
    if not _can_notify(alert_type):
        return

    fire_d     = detections.get('fire', [])
    intruder_d = detections.get('intruder', [])

    if alert_type == 'FIRE':
        fires  = [d for d in fire_d if d['class_id'] == 1]
        conf   = max((d['confidence'] for d in fires), default=0)
        title  = "🔥 FEU DÉTECTÉ — FireGuard"
        msg    = (f"Feu visible sur la caméra ({len(fires)} zone(s)).\n"
                  f"Confiance : {conf:.0%}. Vérifiez immédiatement.")
        tags   = ["fire", "rotating_light", "warning"]
        prio   = "urgent"

    elif alert_type == 'SMOKE':
        smokes = [d for d in fire_d if d['class_id'] == 0]
        conf   = max((d['confidence'] for d in smokes), default=0)
        title  = "💨 FUMÉE DÉTECTÉE — FireGuard"
        msg    = (f"Fumée détectée par la caméra ({len(smokes)} zone(s)).\n"
                  f"Confiance : {conf:.0%}. Risque d'incendie possible.")
        tags   = ["cloud", "warning"]
        prio   = "high"

    else:  # INTRUSION
        persons = [d for d in intruder_d if d['class_id'] == 0]
        animals = [d for d in intruder_d if d['class_id'] == 1]
        parts   = []
        if persons: parts.append(f"{len(persons)} personne(s)")
        if animals: parts.append(f"{len(animals)} animal/animaux")
        detail = " et ".join(parts)
        conf   = max((d['confidence'] for d in intruder_d), default=0)
        title  = "🚨 INTRUSION DÉTECTÉE — FireGuard"
        msg    = (f"Intrusion caméra : {detail}.\n"
                  f"Confiance : {conf:.0%}. Vérifiez le périmètre.")
        tags   = ["bust_in_silhouette", "rotating_light"]
        prio   = "urgent"

    # Capture de la frame annotée
    frame_jpg = _grab_frame_jpg()
    threading.Thread(target=send_alert_notification,
                     args=(title, msg, prio, tags, frame_jpg, {'channel': 'vision', 'alert': alert_type}),
                     daemon=True).start()

def notify_sensor_alert(alert: str, smoke_prob: float, fire_risk: float,
                        gas_class: str, temperature: float, rh: float):
    """Envoie une notification ntfy pour une alerte capteurs (MQ2/MQ6 + météo)."""
    key = 'SENSOR_FIRE' if alert == 'FIRE' else 'SENSOR_WARNING'
    if not _can_notify(key):
        return

    if alert == 'FIRE':
        title = "🔥 ALERTE FEU CAPTEURS — FireGuard"
        msg   = (f"Risque incendie critique détecté par les capteurs.\n"
                 f"Fumée : {smoke_prob:.0%} | Risque météo : {fire_risk:.0%}\n"
                 f"Gaz : {gas_class} | Temp : {temperature:.1f}°C | Humidité : {rh:.0f}%")
        tags  = ["fire", "rotating_light"]
        prio  = "urgent"
    else:  # WARNING
        title = "⚠️ AVERTISSEMENT CAPTEURS — FireGuard"
        msg   = (f"Niveau de risque élevé détecté par les capteurs.\n"
                 f"Fumée : {smoke_prob:.0%} | Risque météo : {fire_risk:.0%}\n"
                 f"Gaz : {gas_class} | Temp : {temperature:.1f}°C | Humidité : {rh:.0f}%")
        tags  = ["warning"]
        prio  = "high"

    threading.Thread(target=send_alert_notification,
                     args=(title, msg, prio, tags, None, {'channel': 'sensor', 'alert': alert}),
                     daemon=True).start()

try:
    import onnxruntime as rt
    ONNX_OK = True
except ImportError:
    ONNX_OK = False
    print("⚠️  onnxruntime manquant — pip install onnxruntime")

# ─────────────────────────────────────────────────────────────────────────────
# CHEMINS
# ─────────────────────────────────────────────────────────────────────────────
APP_DIR      = os.path.dirname(os.path.abspath(__file__))
BASE         = os.path.join(APP_DIR, 'models_onnx')
WEATHER_ONNX = os.path.join(BASE, 'fire_weather_classifier.onnx')
GAS_ONNX     = os.path.join(BASE, 'smoke_gas_calibrated_classifier.onnx')
CONFIG_JSON  = os.path.join(BASE, 'gas_risk_weights.json')
FIRE_ONNX    = os.path.join(BASE, 'best.onnx')
INTRUDER_ONNX= os.path.join(BASE, 'intruder_best.onnx')

# ─────────────────────────────────────────────────────────────────────────────
# CHARGEMENT MODÈLES
# ─────────────────────────────────────────────────────────────────────────────
sess_weather = sess_gas = sess_fire = sess_intruder = None
cfg = CLASS_ORDER = RISK_WEIGHTS = SAFE_ZONE = THRESHOLDS = GATES = None
PROB_CLIP_MAX = 0.85
SENSORS_OK = VISION_OK = False

def load_all_models():
    global sess_weather, sess_gas, sess_fire, sess_intruder
    global cfg, CLASS_ORDER, RISK_WEIGHTS, SAFE_ZONE, PROB_CLIP_MAX
    global THRESHOLDS, GATES, SENSORS_OK, VISION_OK

    if not ONNX_OK:
        print("⚠️  onnxruntime non disponible")
        return

    # ── Modèles capteurs ──
    sensor_files = [WEATHER_ONNX, GAS_ONNX, CONFIG_JSON]
    if all(os.path.exists(p) for p in sensor_files):
        sess_weather = rt.InferenceSession(WEATHER_ONNX)
        sess_gas     = rt.InferenceSession(GAS_ONNX)
        with open(CONFIG_JSON) as f:
            cfg = json.load(f)
        CLASS_ORDER   = cfg['class_order']
        RISK_WEIGHTS  = np.array(cfg['risk_weights'], dtype=np.float32)
        SAFE_ZONE     = cfg['safe_zone']
        PROB_CLIP_MAX = cfg['prob_clip_max']
        THRESHOLDS    = cfg['fusion_thresholds']
        GATES         = cfg['v5_gates']
        SENSORS_OK    = True
        print("✅ Modèles capteurs chargés")
    else:
        print("⚠️  Modèles capteurs non trouvés — mode démo")

    # ── Modèles vision ──
    if os.path.exists(FIRE_ONNX) and os.path.exists(INTRUDER_ONNX):
        sess_fire     = rt.InferenceSession(FIRE_ONNX)
        sess_intruder = rt.InferenceSession(INTRUDER_ONNX)
        VISION_OK     = True
        print("✅ Modèles vision chargés (feu/fumée + intrusion)")
    else:
        print("⚠️  Modèles vision non trouvés")

load_all_models()

# ─────────────────────────────────────────────────────────────────────────────
# YOLO HELPERS
# ─────────────────────────────────────────────────────────────────────────────
FIRE_NAMES     = {0: 'smoke', 1: 'fire'}
INTRUDER_NAMES = {0: 'person', 1: 'animal'}

FIRE_COLORS     = {0: (0, 255, 255), 1: (0, 0, 255)}    # smoke=yellow, fire=red (BGR)
INTRUDER_COLORS = {0: (180, 0, 180), 1: (0, 200, 0)}    # human=purple, animal=green (BGR)

def preprocess_frame(frame, size=640):
    """Resize + normalise une frame OpenCV pour YOLO."""
    img = cv2.resize(frame, (size, size))
    img = img[:, :, ::-1].astype(np.float32) / 255.0   # BGR→RGB, 0-1
    return np.expand_dims(img.transpose(2, 0, 1), 0)    # [1,3,H,W]

def nms(boxes, scores, iou_thr=0.45):
    """Non-Maximum Suppression maison."""
    if len(boxes) == 0:
        return []
    x1, y1, x2, y2 = boxes[:,0], boxes[:,1], boxes[:,2], boxes[:,3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep  = []
    while order.size:
        i = order[0]; keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0, xx2 - xx1); h = np.maximum(0, yy2 - yy1)
        inter = w * h
        iou   = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        order = order[np.where(iou <= iou_thr)[0] + 1]
    return keep

def decode_yolo(output, orig_h, orig_w, conf_thr=0.35, iou_thr=0.45):
    """
    Décode la sortie YOLO [1, 6, 8400] → liste de détections.
    Format : [cx, cy, w, h, cls0_conf, cls1_conf, ...]
    """
    pred = output[0].T          # [8400, 6]
    num_classes = pred.shape[1] - 4
    boxes_xywh   = pred[:, :4]
    class_scores = pred[:, 4:]

    best_cls   = class_scores.argmax(axis=1)
    best_conf  = class_scores.max(axis=1)
    mask       = best_conf > conf_thr

    if not mask.any():
        return []

    boxes_f  = boxes_xywh[mask]
    confs_f  = best_conf[mask]
    classes_f= best_cls[mask]

    # cx,cy,w,h → x1,y1,x2,y2 en coords image originale
    scale_x = orig_w / 640; scale_y = orig_h / 640
    cx = boxes_f[:,0] * scale_x; cy = boxes_f[:,1] * scale_y
    bw = boxes_f[:,2] * scale_x; bh = boxes_f[:,3] * scale_y
    x1 = cx - bw/2; y1 = cy - bh/2
    x2 = cx + bw/2; y2 = cy + bh/2
    xyxy = np.stack([x1,y1,x2,y2], axis=1)

    keep = nms(xyxy, confs_f, iou_thr)
    dets = []
    for k in keep:
        dets.append({
            'class_id':  int(classes_f[k]),
            'confidence': round(float(confs_f[k]), 3),
            'bbox': [int(xyxy[k,0]), int(xyxy[k,1]), int(xyxy[k,2]), int(xyxy[k,3])],
        })
    return dets

def draw_detections(frame, dets, names, colors):
    """Dessine les bounding boxes sur la frame."""
    for d in dets:
        x1,y1,x2,y2 = d['bbox']
        cls  = d['class_id']
        conf = d['confidence']
        col  = colors.get(cls, (200,200,200))
        label= f"{names.get(cls,'?')} {conf:.0%}"
        cv2.rectangle(frame, (x1,y1), (x2,y2), col, 2)
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(frame, (x1, y1-th-8), (x1+tw+6, y1), col, -1)
        cv2.putText(frame, label, (x1+3, y1-4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,255,255), 1, cv2.LINE_AA)
    return frame

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAT GLOBAL CAMÉRA
# ─────────────────────────────────────────────────────────────────────────────
camera_state = {
    'active':    False,
    'frame_jpg': None,
    'detections': {'fire': [], 'intruder': []},
    'lock':      threading.Lock(),
    'cap':       None,
    'thread':    None,
    'show_fire': True,
    'show_intruder': True,
    'conf_fire': 0.35,
    'conf_intruder': 0.35,
}

# État partagé des capteurs pour synchroniser dashboard web et app mobile.
sensor_state_lock = threading.Lock()
sensor_state = {
    'mq2': 100.0,
    'mq6': 80.0,
    'temperature': 20.0,
    'rh': 60.0,
    'wind': 5.0,
    'rain': 0.0,
    'month_num': 7,
    'updated_at': time.time(),
    'source': 'default',
}

alert_state_lock = threading.Lock()
alert_state = {
    'sensor_alert': 'SAFE',
    'vision_alert': 'CLEAR',
    'global_alert': 'SAFE',
    'updated_at': time.time(),
}

def _sensor_state_snapshot():
    with sensor_state_lock:
        return dict(sensor_state)

def _update_sensor_state(payload=None, source='api'):
    payload = payload or {}
    with sensor_state_lock:
        next_state = dict(sensor_state)

        for key in ('mq2', 'mq6', 'temperature', 'rh', 'wind', 'rain'):
            if key in payload:
                try:
                    next_state[key] = float(payload[key])
                except Exception:
                    pass

        if 'month_num' in payload:
            try:
                month = int(payload['month_num'])
                next_state['month_num'] = max(1, min(12, month))
            except Exception:
                pass

        next_state['updated_at'] = time.time()
        next_state['source'] = source
        sensor_state.update(next_state)
        return dict(sensor_state)

def _compute_global_alert(sensor_alert: str, vision_alert: str) -> str:
    if sensor_alert == 'FIRE' or vision_alert == 'FIRE':
        return 'FIRE'
    if sensor_alert == 'WARNING' or vision_alert in ('SMOKE', 'INTRUSION'):
        return 'WARNING'
    return 'SAFE'

def _alert_state_snapshot():
    with alert_state_lock:
        return dict(alert_state)

def _update_alert_state(sensor_alert=None, vision_alert=None):
    with alert_state_lock:
        next_state = dict(alert_state)
        prev_sensor_alert = next_state.get('sensor_alert', 'SAFE')
        prev_vision_alert = next_state.get('vision_alert', 'CLEAR')
        prev_global_alert = next_state.get('global_alert', 'SAFE')

        if sensor_alert in ('SAFE', 'WARNING', 'FIRE'):
            next_state['sensor_alert'] = sensor_alert

        if vision_alert in ('CLEAR', 'SMOKE', 'INTRUSION', 'FIRE'):
            next_state['vision_alert'] = vision_alert

        next_state['global_alert'] = _compute_global_alert(
            next_state['sensor_alert'],
            next_state['vision_alert'],
        )

        has_changed = (
            next_state['sensor_alert'] != prev_sensor_alert
            or next_state['vision_alert'] != prev_vision_alert
            or next_state['global_alert'] != prev_global_alert
        )
        if has_changed:
            next_state['updated_at'] = time.time()

        alert_state.update(next_state)
        return dict(alert_state)

def camera_loop():
    cap = camera_state['cap']
    while camera_state['active'] and cap and cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05); continue

        orig_h, orig_w = frame.shape[:2]
        fire_dets = intruder_dets = []

        if VISION_OK:
            blob = preprocess_frame(frame)

            if camera_state['show_fire']:
                out_fire = sess_fire.run(None, {'images': blob})[0]
                fire_dets = decode_yolo(out_fire, orig_h, orig_w,
                                        conf_thr=camera_state['conf_fire'])

            if camera_state['show_intruder']:
                out_int  = sess_intruder.run(None, {'images': blob})[0]
                intruder_dets = decode_yolo(out_int, orig_h, orig_w,
                                            conf_thr=camera_state['conf_intruder'])

        # Dessiner
        annotated = frame.copy()
        if camera_state['show_fire']:
            draw_detections(annotated, fire_dets, FIRE_NAMES, FIRE_COLORS)
        if camera_state['show_intruder']:
            draw_detections(annotated, intruder_dets, INTRUDER_NAMES, INTRUDER_COLORS)

        # Overlay texte statut
        n_fire = len([d for d in fire_dets if d['class_id']==1])
        n_smoke= len([d for d in fire_dets if d['class_id']==0])
        n_ppl  = len([d for d in intruder_dets if d['class_id']==0])
        n_ani  = len([d for d in intruder_dets if d['class_id']==1])
        status_parts = []
        if n_fire:  status_parts.append(f"FEU:{n_fire}")
        if n_smoke: status_parts.append(f"FUMEE:{n_smoke}")
        if n_ppl:   status_parts.append(f"PERS:{n_ppl}")
        if n_ani:   status_parts.append(f"ANIMAL:{n_ani}")

        vision_alert = 'FIRE' if n_fire else ('SMOKE' if n_smoke else ('INTRUSION' if (n_ppl or n_ani) else 'CLEAR'))
        _update_alert_state(vision_alert=vision_alert)

        status_txt = " | ".join(status_parts) if status_parts else "OK"
        col_status = (0,0,220) if (n_fire or n_smoke) else (0,200,0) if (n_ppl or n_ani) else (160,160,160)
        cv2.putText(annotated, f"FIREGUARD  {status_txt}", (10,28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, col_status, 2, cv2.LINE_AA)

        # Encoder JPEG
        _, jpg = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])

        jpg_bytes = jpg.tobytes()
        with camera_state['lock']:
            camera_state['frame_jpg'] = jpg_bytes
            camera_state['detections'] = {
                'fire':     fire_dets,
                'intruder': intruder_dets,
            }

        # ── Notifications ntfy ──────────────────────────────────────────
        current_dets = {'fire': fire_dets, 'intruder': intruder_dets}
        has_fire = any(d['class_id'] == 1 for d in fire_dets)
        has_smoke = any(d['class_id'] == 0 for d in fire_dets)
        has_intrusion = bool(intruder_dets)

        if has_fire:                                             # Feu
            notify_vision_alert('FIRE', current_dets)
        elif has_smoke:                                          # Fumée seule
            notify_vision_alert('SMOKE', current_dets)

        # Intrusion est déclenchée indépendamment, même si un feu est aussi détecté.
        if has_intrusion:                                        # Intrusion
            notify_vision_alert('INTRUSION', current_dets)

    with camera_state['lock']:
        camera_state['frame_jpg'] = None
        camera_state['active'] = False
    _update_alert_state(vision_alert='CLEAR')

def gen_frames():
    blank = np.zeros((360, 640, 3), dtype=np.uint8)
    cv2.putText(blank, "Camera inactive", (180,180),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (80,80,80), 2)
    _, blank_jpg = cv2.imencode('.jpg', blank)
    blank_bytes  = blank_jpg.tobytes()

    while True:
        with camera_state['lock']:
            jpg = camera_state['frame_jpg']
        frame = jpg if jpg else blank_bytes
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        time.sleep(0.04)   # ~25 fps max

# ─────────────────────────────────────────────────────────────────────────────
# PIPELINE CAPTEURS (identique à api.py précédent)
# ─────────────────────────────────────────────────────────────────────────────
def _gas_model(mq2, mq6):
    if not SENSORS_OK:
        return _gas_demo(mq2, mq6)
    if mq2 < SAFE_ZONE['mq2_threshold'] and mq6 < SAFE_ZONE['mq6_threshold']:
        return {'smoke_prob': SAFE_ZONE['override_smoke_prob'], 'gas_class': 'NoGas',
                'class_proba': {c:0.0 for c in CLASS_ORDER}, 'safe_zone_applied': True}
    feat = np.array([[mq2, mq6]], dtype=np.float32)
    lbl, proba = sess_gas.run(None, {'float_input': feat})
    p = proba[0]
    sp = float(min(np.dot(p, RISK_WEIGHTS), PROB_CLIP_MAX))
    return {'smoke_prob': round(sp,4), 'gas_class': CLASS_ORDER[int(lbl[0])],
            'class_proba': {c: round(float(v),4) for c,v in zip(CLASS_ORDER,p)},
            'safe_zone_applied': False}

def _gas_demo(mq2, mq6):
    if mq2<150 and mq6<120:
        return {'smoke_prob':0.05,'gas_class':'NoGas','class_proba':{'Mixture':.01,'NoGas':.96,'Perfume':.02,'Smoke':.01},'safe_zone_applied':True}
    c=(mq2/1023)*.6+(mq6/1023)*.4
    pS=min(.97,c**.8*1.1);pM=min(.9,c**1.1*.7);pP=max(.01,.15-c*.15);pN=max(.01,1-c*1.2)
    t=pS+pM+pP+pN;pS/=t;pM/=t;pP/=t;pN/=t
    sp=min(pM*.6+pP*.05+pS,.85)
    proba={'Mixture':round(pM,4),'NoGas':round(pN,4),'Perfume':round(pP,4),'Smoke':round(pS,4)}
    gc=max(proba,key=proba.get)
    return {'smoke_prob':round(sp,4),'gas_class':gc,'class_proba':proba,'safe_zone_applied':False}

def _weather_model(temperature, rh, wind, rain, month_num,
                   t_roll=None, r_roll=None, w_roll=None, t_delta=0.0, r_delta=0.0):
    if not SENSORS_OK:
        return _weather_demo(temperature, rh, wind, rain, month_num)
    ms = math.sin(2*math.pi*month_num/12)
    mc = math.cos(2*math.pi*month_num/12)
    ratio = temperature/(rh+1)
    tr = temperature if t_roll is None else t_roll
    rr = rh          if r_roll is None else r_roll
    wr = wind        if w_roll is None else w_roll
    feat = np.array([[temperature,rh,wind,rain,ms,mc,tr,rr,wr,t_delta,r_delta,ratio]], dtype=np.float32)
    lbl, proba = sess_weather.run(None, {'float_input': feat})
    return {'fire_risk_prob': round(float(proba[0][1]),4),
            'weather_label': 'FIRE RISK' if lbl[0]==1 else 'LOW RISK'}

def _weather_demo(temperature, rh, wind, rain, month_num):
    fr=0
    if temperature>35:fr+=.35
    elif temperature>28:fr+=.22
    elif temperature>20:fr+=.10
    else:fr-=.05
    fr+=max(0,1-rh/100)*.30
    if wind>30:fr+=.25
    elif wind>15:fr+=.15
    elif wind>8:fr+=.07
    if rain>5:fr-=.30
    elif rain>1:fr-=.15
    if 6<=month_num<=9:fr+=.12
    elif month_num in[5,10]:fr+=.05
    return {'fire_risk_prob':round(max(.01,min(.99,fr)),4),'weather_label':'—'}

def _gates(fire_risk, smoke_prob, temperature, rh):
    if not SENSORS_OK:
        gates=[]
        if temperature<15:smoke_prob*=.25;gates.append({'name':'cold_temp','label':'Temp froide → ×0.25'})
        if fire_risk<.30:smoke_prob*=.65;gates.append({'name':'low_weather_risk','label':'Faible risque météo → ×0.65'})
        if rh>75:fire_risk*=.60;gates.append({'name':'high_humidity','label':'Humidité haute → ×0.60'})
        return round(fire_risk,4),round(smoke_prob,4),gates
    gates=[]
    if temperature<GATES['cold_temp_threshold']:
        fire_risk*=GATES['cold_temp_multiplier']
        gates.append({'name':'cold_temp','label':f"Temp froide → ×{GATES['cold_temp_multiplier']}"})
    if fire_risk<GATES['weather_gate_threshold']:
        w=GATES['weather_gate_min_weight']
        d=w+(1-w)*(fire_risk/GATES['weather_gate_threshold'])
        smoke_prob*=d
        gates.append({'name':'low_weather_risk','label':f'Faible risque météo → ×{d:.2f}'})
    if rh>GATES['high_rh_threshold']:
        mult=max(GATES['high_rh_min_multiplier'],1-(rh-GATES['high_rh_threshold'])/100)
        fire_risk*=mult
        gates.append({'name':'high_humidity','label':f'Humidité haute → ×{mult:.2f}'})
    return round(fire_risk,4),round(smoke_prob,4),gates

def run_sensor_pipeline(mq2,mq6,temperature,rh,wind,rain,month_num,**kw):
    gas     = _gas_model(mq2,mq6)
    weather = _weather_model(temperature,rh,wind,rain,month_num,
                             kw.get('t_roll'),kw.get('r_roll'),kw.get('w_roll'),
                             kw.get('t_delta',0.0),kw.get('r_delta',0.0))
    adj_fr, adj_sp, gates = _gates(weather['fire_risk_prob'], gas['smoke_prob'], temperature, rh)

    sf = THRESHOLDS['smoke_fire']   if SENSORS_OK else .55
    sw = THRESHOLDS['smoke_warning']if SENSORS_OK else .35
    rf = THRESHOLDS['risk_fire']    if SENSORS_OK else .60
    rw = THRESHOLDS['risk_warning'] if SENSORS_OK else .40

    if adj_sp>sf and adj_fr>rf:
        alert='FIRE';conf=round((adj_sp+adj_fr)/2,3)
    elif adj_sp>sw or adj_fr>rw:
        alert='WARNING';conf=round(max(adj_sp,adj_fr),3)
    else:
        alert='SAFE';conf=round(1-max(adj_sp,adj_fr),3)

    return {'alert':alert,'smoke_prob':adj_sp,'fire_risk_prob':adj_fr,'gas_class':gas['gas_class'],
            'class_proba':gas['class_proba'],'confidence':conf,'gates_applied':gates,
            'safe_zone_applied':gas['safe_zone_applied'],
            'model_mode':'onnx' if SENSORS_OK else 'demo',
            'thresholds':{'smoke_fire':sf,'smoke_warning':sw,'risk_fire':rf,'risk_warning':rw}}

# ─────────────────────────────────────────────────────────────────────────────
# PROPAGATION (Rothermel/McArthur)
# ─────────────────────────────────────────────────────────────────────────────
def compute_spread(temperature, rh, wind, rain, month_num):
    V = 2.0
    f_wind   = 1 + (wind/10)**1.5
    f_hum    = math.exp(-0.035*rh)
    f_temp   = 1 + 0.015*max(0, temperature-20)
    f_season = 1.3 if 6<=month_num<=9 else (1.1 if month_num in[5,10] else 1.0)
    f_rain   = max(0.1, 1-rain/5)
    speed    = round(V*f_wind*f_hum*f_temp*f_season*f_rain, 2)
    if speed<2:   level,desc,color='FAIBLE','Feu contrôlable à pied','green'
    elif speed<8: level,desc,color='MODÉRÉ','Nécessite des véhicules','amber'
    elif speed<25:level,desc,color='RAPIDE','Feu de garrigue / maquis','orange'
    else:         level,desc,color='EXTRÊME','Feu de couronne, incontrôlable','red'
    return {'speed_m_per_min':speed,'speed_km_per_h':round(speed*.06,3),
            'level':level,'description':desc,'color':color,
            'factors':{'V_base':V,'F_vent':round(f_wind,3),'F_humidite':round(f_hum,3),
                       'F_temp':round(f_temp,3),'F_saison':round(f_season,3),'F_pluie':round(f_rain,3)}}

# ─────────────────────────────────────────────────────────────────────────────
# FLASK
# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

@app.route('/')
def dashboard():
    dashboard_path = os.path.join(APP_DIR, 'dashboard.html')
    if not os.path.exists(dashboard_path):
        return jsonify({'success': False, 'error': f'dashboard.html introuvable: {dashboard_path}'}), 404
    with open(dashboard_path, 'r', encoding='utf-8') as f:
        html = f.read()
    return Response(html, mimetype='text/html')

@app.route('/status')
def status():
    if not camera_state['active']:
        _update_alert_state(vision_alert='CLEAR')
    current_alerts = _alert_state_snapshot()

    return jsonify({
        'online': True,
        'sensors_ok': SENSORS_OK,
        'vision_ok':  VISION_OK,
        'camera_active': camera_state['active'],
        'mobile_push_devices': len(_snapshot_mobile_push_tokens()),
        'sensor_alert': current_alerts['sensor_alert'],
        'vision_alert': current_alerts['vision_alert'],
        'global_alert': current_alerts['global_alert'],
        'alert_updated_at': current_alerts['updated_at'],
        'model_mode': 'onnx' if SENSORS_OK else 'demo',
    })

@app.route('/sensors/state', methods=['GET', 'POST'])
def sensors_state():
    if request.method == 'POST':
        d = request.get_json(force=True) or {}
        st = _update_sensor_state(d, source='sync')
        return jsonify({'ok': True, **st})
    return jsonify(_sensor_state_snapshot())

@app.route('/predict', methods=['POST'])
def predict():
    try:
        d = request.get_json(force=True) or {}
        st = _update_sensor_state(d, source='predict')
        mq2  = float(st['mq2']);          mq6  = float(st['mq6'])
        temp = float(st['temperature']);  rh   = float(st['rh'])
        wind = float(st['wind']);         rain = float(st['rain'])
        month= int(st['month_num'])
        result = run_sensor_pipeline(mq2,mq6,temp,rh,wind,rain,month)
        spread = compute_spread(temp,rh,wind,rain,month)
        _update_alert_state(sensor_alert=result['alert'])

        # ── Notification ntfy capteurs ──────────────────────────────────
        if result['alert'] in ('FIRE', 'WARNING'):
            notify_sensor_alert(
                alert=result['alert'],
                smoke_prob=result['smoke_prob'],
                fire_risk=result['fire_risk_prob'],
                gas_class=result['gas_class'],
                temperature=temp,
                rh=rh,
            )

        return jsonify({'success':True, **result, 'spread_speed':spread})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)}), 400

@app.route('/camera/start', methods=['POST'])
def camera_start():
    if camera_state['active']:
        return jsonify({'ok':True,'msg':'déjà active'})
    d = request.get_json(force=True) or {}
    cam_id = int(d.get('cam_id', 0))
    cap = cv2.VideoCapture(cam_id)
    if not cap.isOpened():
        return jsonify({'ok':False,'error':f'Impossible d\'ouvrir la caméra {cam_id}'}), 400
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    camera_state['cap']    = cap
    camera_state['active'] = True
    t = threading.Thread(target=camera_loop, daemon=True)
    camera_state['thread'] = t
    t.start()
    return jsonify({'ok':True,'msg':f'Caméra {cam_id} démarrée'})

@app.route('/camera/stop', methods=['POST'])
def camera_stop():
    camera_state['active'] = False
    _update_alert_state(vision_alert='CLEAR')
    time.sleep(0.2)
    if camera_state['cap']:
        camera_state['cap'].release()
        camera_state['cap'] = None
    return jsonify({'ok':True})

@app.route('/camera/config', methods=['POST'])
def camera_config():
    d = request.get_json(force=True) or {}
    if 'show_fire'      in d: camera_state['show_fire']      = bool(d['show_fire'])
    if 'show_intruder'  in d: camera_state['show_intruder']  = bool(d['show_intruder'])
    if 'conf_fire'      in d: camera_state['conf_fire']      = float(d['conf_fire'])
    if 'conf_intruder'  in d: camera_state['conf_intruder']  = float(d['conf_intruder'])
    return jsonify({'ok':True})

@app.route('/camera/detections')
def camera_detections():
    with camera_state['lock']:
        dets = camera_state['detections']
    fire_d     = dets.get('fire', [])
    intruder_d = dets.get('intruder', [])
    has_fire   = any(d['class_id']==1 for d in fire_d)
    has_smoke  = any(d['class_id']==0 for d in fire_d)
    has_person = any(d['class_id']==0 for d in intruder_d)
    has_animal = any(d['class_id']==1 for d in intruder_d)
    vision_alert = 'FIRE' if has_fire else ('SMOKE' if has_smoke else
                   ('INTRUSION' if (has_person or has_animal) else 'CLEAR'))
    if not camera_state['active']:
        vision_alert = 'CLEAR'
    _update_alert_state(vision_alert=vision_alert)

    return jsonify({
        'fire':     fire_d,
        'intruder': intruder_d,
        'summary':  {'has_fire':has_fire,'has_smoke':has_smoke,
                     'has_person':has_person,'has_animal':has_animal,
                     'vision_alert':vision_alert},
        'camera_active': camera_state['active'],
    })

@app.route('/camera/stream')
def camera_stream():
    return Response(gen_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/ntfy/config', methods=['GET', 'POST'])
def ntfy_config():
    global NTFY_TOPIC, NTFY_SERVER, NTFY_COOLDOWN
    if request.method == 'POST':
        d = request.get_json(force=True) or {}
        if 'topic'    in d: NTFY_TOPIC    = str(d['topic']).strip()
        if 'server'   in d: NTFY_SERVER   = str(d['server']).rstrip('/')
        if 'cooldown' in d: NTFY_COOLDOWN = max(10, int(d['cooldown']))
        return jsonify({'ok': True, 'topic': NTFY_TOPIC,
                        'server': NTFY_SERVER, 'cooldown': NTFY_COOLDOWN})
    return jsonify({'topic': NTFY_TOPIC, 'server': NTFY_SERVER, 'cooldown': NTFY_COOLDOWN})

@app.route('/mobile/notify/register', methods=['POST'])
def mobile_notify_register():
    d = request.get_json(force=True) or {}
    token = str(d.get('token', '')).strip()
    platform = str(d.get('platform', 'unknown')).strip()[:32] or 'unknown'

    if not _is_expo_push_token(token):
        return jsonify({'ok': False, 'error': 'Expo push token invalide'}), 400

    count = _register_mobile_push_token(token, platform)
    return jsonify({'ok': True, 'provider': 'expo', 'count': count})

@app.route('/mobile/notify/unregister', methods=['POST'])
def mobile_notify_unregister():
    d = request.get_json(force=True) or {}
    token = str(d.get('token', '')).strip()
    removed, count = _unregister_mobile_push_token(token)
    return jsonify({'ok': True, 'removed': removed, 'count': count})

@app.route('/mobile/notify/status')
def mobile_notify_status():
    with mobile_push_lock:
        devices = [
            {
                'token': _mask_push_token(token),
                'platform': meta.get('platform', 'unknown'),
                'updated_at': meta.get('updated_at'),
            }
            for token, meta in mobile_push_tokens.items()
        ]
    return jsonify({'enabled': EXPO_PUSH_ENABLED, 'count': len(devices), 'devices': devices})

@app.route('/mobile/notify/test', methods=['POST'])
def mobile_notify_test():
    d = request.get_json(force=True) or {}
    title = str(d.get('title', '🧪 Test FireGuard Mobile'))
    message = str(d.get('message', 'Notification test envoyée à l\'app mobile'))

    mobile_sent, reason = send_expo_push(title, message, data={'channel': 'test'})
    if mobile_sent:
        return jsonify({'ok': True, 'channel': 'mobile', 'reason': reason})

    frame_jpg = _grab_frame_jpg()
    threading.Thread(
        target=send_ntfy,
        args=(title, message, 'default', ['white_check_mark'], frame_jpg),
        daemon=True,
    ).start()
    return jsonify({'ok': True, 'channel': 'ntfy-fallback', 'reason': reason})

@app.route('/ntfy/test', methods=['POST'])
def ntfy_test():
    """Envoie une notification de test pour vérifier la configuration."""
    frame_jpg = _grab_frame_jpg()
    threading.Thread(
        target=send_ntfy,
        args=("🧪 Test FireGuard",
              "Notification de test — FireGuard est correctement configuré !",
              "default", ["white_check_mark"], frame_jpg),
        daemon=True
    ).start()
    return jsonify({'ok': True, 'msg': f'Notification test envoyée sur {NTFY_TOPIC}'})

if __name__ == '__main__':
    print()
    print("="*58)
    print("  🔥 FireGuard v5 — Serveur unifié")
    print("="*58)
    print(f"  Capteurs ONNX  : {'✅' if SENSORS_OK else '⚠️  mode démo'}")
    print(f"  Vision ONNX    : {'✅ feu/fumée + intrusion' if VISION_OK else '⚠️  non chargés'}")
    print(f"  Dashboard      : http://localhost:5000")
    print(f"  Stream caméra  : http://localhost:5000/camera/stream")
    print("="*58)
    print()
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)