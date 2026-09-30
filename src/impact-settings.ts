export interface ImpactSettings {
  particleDensity: number;
  particleSize: number;
  screenShake: number;
}

// Keep stored/rendered multipliers absolute so recalibrating the labels preserves saved mixes.
export const DEFAULT_IMPACT_SETTINGS: Readonly<ImpactSettings> = {
  particleDensity: 0.6,
  particleSize: 0.6,
  screenShake: 1.75,
};

export const IMPACT_PERCENT_RANGE = { minimum: 0, maximum: 300, step: 1 } as const;

export const IMPACT_CONTROLS: readonly {
  key: keyof ImpactSettings;
  label: string;
}[] = [
  { key: 'particleDensity', label: 'Particle density' },
  { key: 'particleSize', label: 'Particle size' },
  { key: 'screenShake', label: 'Screen shake' },
];

export function impactValue(key: keyof ImpactSettings, percent: number): number {
  return (DEFAULT_IMPACT_SETTINGS[key] * percent) / 100;
}

export function impactPercent(key: keyof ImpactSettings, value: number): number {
  return Math.round((value / DEFAULT_IMPACT_SETTINGS[key]) * 100);
}

export function normalizeImpactSettings(value: Partial<ImpactSettings>): ImpactSettings {
  const result = { ...DEFAULT_IMPACT_SETTINGS };
  for (const { key } of IMPACT_CONTROLS) {
    const setting = value[key];
    if (typeof setting === 'number' && Number.isFinite(setting))
      result[key] = Math.min(impactValue(key, IMPACT_PERCENT_RANGE.maximum), Math.max(0, setting));
  }
  return result;
}
