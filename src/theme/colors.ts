import type { AlertLevel, SpreadLevel } from '@/src/api/types';

export type AppColors = {
  primary: string;
  warning: string;
  danger: string;
  safe: string;
  warningAlert: string;
  fire: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  online: string;
  offline: string;
  overlay: string;
  shadowOpacity: number;
  cardShadow: string;
  buttonShadow: string;
};

export const lightColors: AppColors = {
  primary: '#1D7A46',
  warning: '#D98B1B',
  danger: '#C23827',
  safe: '#1D7A46',
  warningAlert: '#D98B1B',
  fire: '#C23827',
  background: '#F4F6F2',
  surface: '#FFFFFF',
  text: '#132019',
  muted: '#5A6A60',
  border: '#DDE4DC',
  online: '#1F8A4D',
  offline: '#D14C3A',
  overlay: 'rgba(0,0,0,0.4)',
  shadowOpacity: 0.14,
  cardShadow: '0 8px 24px rgba(16,24,20,0.08)',
  buttonShadow: '0 6px 16px rgba(12,19,15,0.16)',
};

export const darkColors: AppColors = {
  primary: '#45B46D',
  warning: '#F0B432',
  danger: '#FF6B5D',
  safe: '#45B46D',
  warningAlert: '#F0B432',
  fire: '#FF6B5D',
  background: '#0F1411',
  surface: '#171E1A',
  text: '#EAF3ED',
  muted: '#9AAEA0',
  border: '#28342D',
  online: '#45B46D',
  offline: '#FF6B5D',
  overlay: 'rgba(0,0,0,0.6)',
  shadowOpacity: 0.28,
  cardShadow: '0 10px 28px rgba(0,0,0,0.35)',
  buttonShadow: '0 8px 20px rgba(0,0,0,0.4)',
};

// Backward-compatible export for files that still use static palette values.
export const colors = lightColors;

export function getAlertColor(alert: AlertLevel, palette: AppColors = lightColors) {
  const map: Record<AlertLevel, string> = {
    SAFE: palette.safe,
    WARNING: palette.warningAlert,
    FIRE: palette.fire,
  };
  return map[alert];
}

export function getSpreadColor(level: SpreadLevel) {
  const map: Record<SpreadLevel, string> = {
    FAIBLE: '#4CAF50',
    MODERE: '#FFC107',
    RAPIDE: '#FF9800',
    EXTREME: '#F44336',
  };
  return map[level];
}
