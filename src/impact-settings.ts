export interface ImpactSettings {
  particleDensity: number;
  particleSize: number;
  screenShake: number;
}

export const DEFAULT_IMPACT_SETTINGS: ImpactSettings = {
  particleDensity: 1.5,
  particleSize: 1,
  screenShake: 1.25,
};

export const IMPACT_CONTROLS: readonly {
  key: keyof ImpactSettings;
  label: string;
  minimum: number;
  maximum: number;
  step: number;
}[] = [
  { key: 'particleDensity', label: 'Particle density', minimum: 0, maximum: 4, step: 0.1 },
  { key: 'particleSize', label: 'Particle size', minimum: 0.25, maximum: 2.5, step: 0.05 },
  { key: 'screenShake', label: 'Screen shake', minimum: 0, maximum: 3, step: 0.05 },
];

export function normalizeImpactSettings(value: Partial<ImpactSettings>): ImpactSettings {
  const result = { ...DEFAULT_IMPACT_SETTINGS };
  for (const { key, minimum, maximum } of IMPACT_CONTROLS) {
    const setting = value[key];
    if (typeof setting === 'number' && Number.isFinite(setting))
      result[key] = Math.min(maximum, Math.max(minimum, setting));
  }
  return result;
}
