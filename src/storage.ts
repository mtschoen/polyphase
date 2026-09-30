import { PIECE_SIZES, type PieceSize } from './game/types';
import {
  DEFAULT_IMPACT_SETTINGS,
  normalizeImpactSettings,
  type ImpactSettings,
} from './impact-settings';

export interface Settings extends ImpactSettings {
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
  ghost: boolean;
  theme: number;
  fusionSizes: PieceSize[];
  announcer: boolean;
}
const defaults: Settings = {
  ...DEFAULT_IMPACT_SETTINGS,
  volume: 0.6,
  muted: false,
  reducedMotion: false,
  ghost: true,
  theme: 0,
  fusionSizes: [5, 6],
  announcer: true,
};
export function loadSettings(): Settings {
  try {
    const value = JSON.parse(
      localStorage.getItem('polyphase.settings') || '{}',
    ) as Partial<Settings>;
    const fusionSizes = PIECE_SIZES.filter(
      (size) => Array.isArray(value.fusionSizes) && value.fusionSizes.includes(size),
    );
    return {
      ...normalizeImpactSettings(value),
      volume:
        typeof value.volume === 'number' && Number.isFinite(value.volume)
          ? Math.min(1, Math.max(0, value.volume))
          : defaults.volume,
      muted: typeof value.muted === 'boolean' ? value.muted : defaults.muted,
      reducedMotion:
        typeof value.reducedMotion === 'boolean' ? value.reducedMotion : defaults.reducedMotion,
      ghost: typeof value.ghost === 'boolean' ? value.ghost : defaults.ghost,
      theme:
        typeof value.theme === 'number' &&
        Number.isInteger(value.theme) &&
        value.theme >= 0 &&
        value.theme < 3
          ? value.theme
          : 0,
      fusionSizes: fusionSizes.length ? fusionSizes : [...defaults.fusionSizes],
      announcer: typeof value.announcer === 'boolean' ? value.announcer : defaults.announcer,
    };
  } catch {
    return { ...defaults, fusionSizes: [...defaults.fusionSizes] };
  }
}
export function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem('polyphase.settings', JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
export function readBest(mode: string, difficulty: string): number {
  try {
    const value = Number(localStorage.getItem(`polyphase.best.${mode}.${difficulty}`));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}
export function saveBest(mode: string, difficulty: string, score: number): boolean {
  try {
    localStorage.setItem(`polyphase.best.${mode}.${difficulty}`, String(score));
    return true;
  } catch {
    return false;
  }
}
