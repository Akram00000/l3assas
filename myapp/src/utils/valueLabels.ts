type Dict = Record<string, string>;

function normalize(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\s_-]+/g, '').toUpperCase();
}

export function localizeAlertValue(value: unknown, t: Dict) {
  const map: Record<string, string> = {
    SAFE: t.safe,
    WARNING: t.warning,
    FIRE: t.fire,
    CLEAR: t.clear,
  };
  const key = normalize(value);
  if (!key) return typeof value === 'string' ? value : '--';
  return map[key] ?? (typeof value === 'string' ? value : '--');
}

export function localizeVisionAlertValue(value: unknown, t: Dict) {
  const map: Record<string, string> = {
    FIRE: t.fire,
    SMOKE: t.smokeDetection,
    INTRUSION: t.intrusion,
    CLEAR: t.clear,
  };
  const key = normalize(value);
  if (!key) return typeof value === 'string' ? value : '--';
  return map[key] ?? (typeof value === 'string' ? value : '--');
}

export function localizeSpreadLevelValue(value: unknown, t: Dict) {
  const map: Record<string, string> = {
    FAIBLE: t.faible,
    MODERE: t.modere,
    RAPIDE: t.rapide,
    EXTREME: t.extremeLevel,
  };
  const key = normalize(value);
  if (!key) return typeof value === 'string' ? value : '--';
  return map[key] ?? (typeof value === 'string' ? value : '--');
}

export function localizeGasClassValue(value: unknown, t: Dict) {
  const map: Record<string, string> = {
    NOGAS: t.noGas,
    SMOKE: t.smokeDetection,
    MIXTURE: t.mixture,
    PERFUME: t.perfume,
  };
  const key = normalize(value);
  if (!key) return typeof value === 'string' ? value : '--';
  return map[key] ?? (typeof value === 'string' ? value : '--');
}
