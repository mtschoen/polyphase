import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/audio';
import type { AudioLane, VoiceOptions } from '../src/audio';

interface Tone {
  note: number;
  time: number;
  duration: number;
  volume: number;
  options: VoiceOptions;
}

function capture(type: 'clear' | 'lock' | 'drop', amount = 1) {
  const tones: Tone[] = [];
  const noises: { duration: number; volume: number }[] = [];
  const engine = new AudioEngine();
  const instruments = engine as unknown as {
    context: { state: string; currentTime: number };
    note: (
      note: number,
      time: number,
      duration: number,
      volume: number,
      lane: AudioLane,
      options?: VoiceOptions,
    ) => void;
    kick: (time: number, volume: number) => void;
    noise: (time: number, duration: number, volume: number) => void;
  };
  instruments.context = { state: 'running', currentTime: 0 };
  instruments.note = (note, time, duration, volume, _lane, options = {}) =>
    tones.push({ note, time, duration, volume, options });
  instruments.kick = (time, volume) =>
    tones.push({ note: 52, time, duration: 0.32, volume, options: {} });
  instruments.noise = (_time, duration, volume) => noises.push({ duration, volume });
  engine.effect(type, amount);
  return { tones, noises };
}

describe('arcade sound effects', () => {
  it('gives each clear tier a distinct, increasingly rich and longer musical response', () => {
    const tiers = [1, 2, 3, 4, 5, 6].map((lines) => capture('clear', lines));
    const endings = tiers.map(({ tones, noises }) =>
      Math.max(
        ...tones.map((tone) => tone.time + tone.duration),
        ...noises.map((noise) => noise.duration),
      ),
    );
    expect(new Set(tiers.map((tier) => JSON.stringify(tier))).size).toBe(6);
    for (let index = 1; index < tiers.length; index++) {
      expect(endings[index]).toBeGreaterThan(endings[index - 1]);
      expect(tiers[index].tones.length).toBeGreaterThan(tiers[index - 1].tones.length);
    }
    expect(endings[0]).toBeLessThan(0.4);
    expect(tiers[5].tones.some((tone) => tone.note < 48)).toBe(true);
    expect(tiers[5].noises.length).toBeGreaterThan(0);
    expect(tiers[5].tones.length).toBeLessThanOrEqual(20);
  });

  it('keeps landing and drop effects lighter than a one-line clear', () => {
    const landing = capture('lock');
    const drop = capture('drop');
    const single = capture('clear');
    expect(landing.noises.length).toBeGreaterThan(0);
    expect(Math.max(...landing.tones.map((tone) => tone.volume))).toBeLessThan(
      Math.max(...single.tones.map((tone) => tone.volume)),
    );
    expect(Math.max(...drop.noises.map((noise) => noise.volume))).toBeLessThan(0.05);
  });

  it.each([NaN, Infinity, -2, 0])(
    'normalizes invalid clear amount %s to the first tier',
    (amount) => {
      expect(capture('clear', amount)).toEqual(capture('clear', 1));
    },
  );

  it('caps oversized clear amounts at Hexageddon', () => {
    expect(capture('clear', 99)).toEqual(capture('clear', 6));
  });

  it('briefly ducks music for a big clear and cancels its pending restoration on pause', () => {
    const automation: { value: number; time: number }[] = [];
    const gain = {
      value: 1,
      cancelScheduledValues: (time: number) => {
        for (let index = automation.length - 1; index >= 0; index--)
          if (automation[index].time >= time) automation.splice(index, 1);
      },
      setValueAtTime: (value: number, time: number) => automation.push({ value, time }),
      linearRampToValueAtTime: (value: number, time: number) => automation.push({ value, time }),
    };
    const engine = new AudioEngine();
    const seam = engine as unknown as {
      context: { state: string; currentTime: number };
      musicBus: { output: { gain: typeof gain } };
      playing: boolean;
      note: () => void;
      noise: () => void;
    };
    seam.context = { state: 'running', currentTime: 5 };
    seam.musicBus = { output: { gain } };
    seam.playing = true;
    seam.note = () => {};
    seam.noise = () => {};
    engine.effect('clear', 6);
    expect(automation.some((event) => event.value === 0.6)).toBe(true);
    expect(automation.at(-1)?.value).toBe(1);
    engine.setPlaying(false);
    expect(automation.at(-1)?.value).toBe(0);
    expect(automation.some((event) => event.value === 1 && event.time > 5)).toBe(false);
  });
});
