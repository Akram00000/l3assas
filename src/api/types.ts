export type ModelMode = 'onnx' | 'demo' | 'local';
export type AlertLevel = 'SAFE' | 'WARNING' | 'FIRE';
export type VisionAlert = 'FIRE' | 'SMOKE' | 'INTRUSION' | 'CLEAR';
export type SpreadLevel = 'FAIBLE' | 'MODERE' | 'RAPIDE' | 'EXTREME';

export interface PredictRequest {
  mq2: number;
  mq6: number;
  temperature: number;
  rh: number;
  wind: number;
  rain: number;
  month_num: number;
}

export interface CameraStartRequest {
  cam_id: number;
}

export interface CameraConfigRequest {
  show_fire?: boolean;
  show_intruder?: boolean;
  conf_fire?: number;
  conf_intruder?: number;
}

export interface NtfyConfigRequest {
  topic?: string;
  server?: string;
  cooldown?: number;
}

export interface StatusResponse {
  online: boolean;
  sensors_ok: boolean;
  vision_ok: boolean;
  camera_active: boolean;
  model_mode: ModelMode;
}

export interface SpreadSpeed {
  speed_m_per_min: number;
  speed_km_per_h?: number;
  level: SpreadLevel;
  description: string;
  color: 'green' | 'amber' | 'orange' | 'red';
  factors: {
    V_base: number;
    F_vent: number;
    F_humidite: number;
    F_temp: number;
    F_saison: number;
    F_pluie: number;
  };
}

export interface PredictResponse {
  success: boolean;
  alert: AlertLevel;
  smoke_prob: number;
  fire_risk_prob: number;
  gas_class: string;
  class_proba: Record<string, number | undefined>;
  confidence: number;
  gates_applied: { name: string; label: string }[];
  safe_zone_applied: boolean;
  model_mode: ModelMode;
  spread_speed: SpreadSpeed;
  error?: string;
}

export interface Detection {
  class_id: number;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface CameraDetectionsResponse {
  fire: Detection[];
  intruder: Detection[];
  summary: {
    has_fire: boolean;
    has_smoke: boolean;
    has_person: boolean;
    has_animal: boolean;
    vision_alert: VisionAlert;
  };
  camera_active: boolean;
}

export interface SimpleOkResponse {
  ok: boolean;
  msg?: string;
  error?: string;
}

export interface NtfyConfigResponse {
  topic: string;
  server: string;
  cooldown: number;
}
