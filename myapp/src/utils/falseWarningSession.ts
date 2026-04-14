import type { PredictRequest, SensorStateResponse } from '@/src/api/types';

type SensorLike = Partial<PredictRequest> | Partial<SensorStateResponse> | null | undefined;

type SafeProfile = {
  baseline: PredictRequest;
  tolerance: PredictRequest;
  createdAt: number;
};

const SAFE_PROFILES: SafeProfile[] = [];
const MAX_PROFILES = 30;

const MIN_TOLERANCE: PredictRequest = {
  mq2: 12,
  mq6: 10,
  temperature: 1.8,
  rh: 6,
  wind: 1.8,
  rain: 0.9,
  month_num: 1,
};

function toFiniteNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPredictRequest(input: SensorLike): PredictRequest | null {
  if (!input) return null;

  const mq2 = toFiniteNumber(input.mq2);
  const mq6 = toFiniteNumber(input.mq6);
  const temperature = toFiniteNumber(input.temperature);
  const rh = toFiniteNumber(input.rh);
  const wind = toFiniteNumber(input.wind);
  const rain = toFiniteNumber(input.rain);
  const monthNum = toFiniteNumber(input.month_num);

  if (
    mq2 === null ||
    mq6 === null ||
    temperature === null ||
    rh === null ||
    wind === null ||
    rain === null ||
    monthNum === null
  ) {
    return null;
  }

  return {
    mq2,
    mq6,
    temperature,
    rh,
    wind,
    rain,
    month_num: Math.max(1, Math.min(12, Math.round(monthNum))),
  };
}

function buildTolerance(base: PredictRequest): PredictRequest {
  return {
    mq2: Math.max(MIN_TOLERANCE.mq2, Math.abs(base.mq2) * 0.08),
    mq6: Math.max(MIN_TOLERANCE.mq6, Math.abs(base.mq6) * 0.08),
    temperature: Math.max(MIN_TOLERANCE.temperature, Math.abs(base.temperature) * 0.05),
    rh: Math.max(MIN_TOLERANCE.rh, Math.abs(base.rh) * 0.06),
    wind: Math.max(MIN_TOLERANCE.wind, Math.abs(base.wind) * 0.2),
    rain: Math.max(MIN_TOLERANCE.rain, Math.abs(base.rain) * 0.25),
    month_num: MIN_TOLERANCE.month_num,
  };
}

function isWithin(value: number, baseline: number, tolerance: number) {
  return Math.abs(value - baseline) <= tolerance;
}

function matchesProfile(input: PredictRequest, profile: SafeProfile) {
  return (
    isWithin(input.mq2, profile.baseline.mq2, profile.tolerance.mq2) &&
    isWithin(input.mq6, profile.baseline.mq6, profile.tolerance.mq6) &&
    isWithin(input.temperature, profile.baseline.temperature, profile.tolerance.temperature) &&
    isWithin(input.rh, profile.baseline.rh, profile.tolerance.rh) &&
    isWithin(input.wind, profile.baseline.wind, profile.tolerance.wind) &&
    isWithin(input.rain, profile.baseline.rain, profile.tolerance.rain) &&
    isWithin(input.month_num, profile.baseline.month_num, profile.tolerance.month_num)
  );
}

export function rememberFalseWarningProfile(input: SensorLike) {
  const normalized = toPredictRequest(input);
  if (!normalized) return false;

  const existingIndex = SAFE_PROFILES.findIndex((profile) => matchesProfile(normalized, profile));
  const nextProfile: SafeProfile = {
    baseline: normalized,
    tolerance: buildTolerance(normalized),
    createdAt: Date.now(),
  };

  if (existingIndex >= 0) {
    SAFE_PROFILES[existingIndex] = nextProfile;
    return true;
  }

  SAFE_PROFILES.push(nextProfile);
  if (SAFE_PROFILES.length > MAX_PROFILES) {
    SAFE_PROFILES.shift();
  }
  return true;
}

export function shouldTreatAsSafeFromFalseWarning(input: SensorLike) {
  const normalized = toPredictRequest(input);
  if (!normalized) return false;
  return SAFE_PROFILES.some((profile) => matchesProfile(normalized, profile));
}
