import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, saveSettings } from '../src/storage';
import { DEFAULT_IMPACT_SETTINGS, impactPercent, impactValue } from '../src/impact-settings';

let stored: string;
beforeEach(() => {
  stored = '{}';
  vi.stubGlobal('localStorage', {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('saved impact controls', () => {
  it('gives existing installs fuller defaults without changing their audio or motion choices', () => {
    stored = JSON.stringify({ volume: 1, reducedMotion: true, muted: true });
    expect(loadSettings()).toMatchObject({
      ...DEFAULT_IMPACT_SETTINGS,
      volume: 1,
      reducedMotion: true,
      muted: true,
    });
  });

  it('retains zero density and zero shake, with particle size independently bounded', () => {
    stored = JSON.stringify({ particleDensity: -2, particleSize: 99, screenShake: 0 });
    expect(loadSettings()).toMatchObject({ particleDensity: 0, particleSize: 1.8, screenShake: 0 });
    stored = JSON.stringify({ particleDensity: 9, particleSize: 0, screenShake: 9 });
    expect(loadSettings()).toMatchObject({
      particleDensity: 1.8,
      particleSize: 0,
      screenShake: 5.25,
    });
  });

  it.each([
    'null',
    'broken JSON',
    '{"particleDensity":"4","particleSize":null,"screenShake":false}',
  ])('recovers usable impact defaults from %s', (value) => {
    stored = value;
    expect(loadSettings()).toMatchObject(DEFAULT_IMPACT_SETTINGS);
  });

  it('round-trips all three controls independently of reduced motion', () => {
    const settings = {
      ...loadSettings(),
      particleDensity: 1.2,
      particleSize: 0.9,
      screenShake: 0,
      reducedMotion: true,
    };
    expect(saveSettings(settings)).toBe(true);
    expect(loadSettings()).toEqual(settings);
  });

  it('relabels the saved 60/60/175 mix as 100% without changing its rendered values', () => {
    stored = JSON.stringify({ particleDensity: 0.6, particleSize: 0.6, screenShake: 1.75 });
    const settings = loadSettings();
    for (const key of ['particleDensity', 'particleSize', 'screenShake'] as const) {
      expect(settings[key]).toBe(DEFAULT_IMPACT_SETTINGS[key]);
      expect(impactPercent(key, settings[key])).toBe(100);
      expect(impactValue(key, 100)).toBe(settings[key]);
      expect(impactValue(key, 0)).toBe(0);
      expect(impactPercent(key, impactValue(key, 300))).toBe(300);
    }
  });
});
