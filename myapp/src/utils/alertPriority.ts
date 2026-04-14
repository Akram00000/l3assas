import type { AlertLevel, VisionAlert } from '@/src/api/types';

export function computeGlobalAlert(sensorAlert: AlertLevel, visionAlert: VisionAlert): AlertLevel {
  if (sensorAlert === 'FIRE' || visionAlert === 'FIRE') return 'FIRE';
  if (sensorAlert === 'WARNING' || visionAlert === 'SMOKE' || visionAlert === 'INTRUSION') {
    return 'WARNING';
  }
  return 'SAFE';
}
