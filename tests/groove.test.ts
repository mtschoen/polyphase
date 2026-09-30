import { describe, expect, it } from 'vitest';
import { scheduleStep, scorePosition, type ScoreInstruments } from '../src/score';
import type { VoiceOptions } from '../src/audio';

function capture(size: number, bars = 1, energy = 0) {
  const kicks: { step: number; volume: number }[] = [];
  const noises: { step: number; duration: number; volume: number; filter: BiquadFilterType }[] = [];
  const notes: { step: number; pitch: number; options: VoiceOptions }[] = [];
  const instruments: ScoreInstruments = {
    kick(step, volume) {
      kicks.push({ step, volume });
    },
    noise(step, duration, volume, _frequency, filter) {
      noises.push({ step, duration, volume, filter });
    },
    note(pitch, step, _duration, _volume, _lane, options = {}) {
      notes.push({ step, pitch, options });
    },
  };
  const length = scorePosition('fusion', 0, [size]).stepsPerBar;
  for (let step = 0; step < length * bars; step++)
    scheduleStep(instruments, step, 'fusion', 0, energy, step, [size]);
  return { kicks, noises, notes, length };
}

describe('dance groove at zero pressure', () => {
  it.each([1, 2, 3, 4, 5])('drives every quarter in size %s with a kick', (size) => {
    const { kicks, length } = capture(size);
    expect(kicks.map(({ step }) => step)).toEqual(
      Array.from({ length: length / 2 }, (_, index) => index * 2),
    );
  });

  it('drives six quarters with strong accents on the two three-beat groups', () => {
    const { kicks } = capture(6);
    expect(kicks.map(({ step }) => step)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(kicks[0].volume).toBeGreaterThan(kicks[1].volume);
    expect(kicks[3].volume).toBe(kicks[0].volume);
  });

  it('makes offbeat hats stronger and longer than the onbeat ticks', () => {
    const hats = capture(4).noises.filter(({ filter }) => filter === 'highpass');
    const onbeat = hats.find(({ step }) => step === 0)!;
    const offbeat = hats.find(({ step }) => step === 1)!;
    expect(offbeat.volume).toBeGreaterThan(onbeat.volume * 2);
    expect(offbeat.duration).toBeGreaterThan(onbeat.duration);
  });

  it.each([4, 5, 6])('has syncopated bass and a layered clap in size %s', (size) => {
    const { notes, noises } = capture(size);
    const offbeat = 1;
    expect(notes.some(({ step, pitch }) => step === offbeat && pitch < 48)).toBe(true);
    const backbeat = size === 5 ? 4 : 2;
    const claps = noises.filter(
      ({ step, filter }) => step >= backbeat && step < backbeat + 0.1 && filter === 'bandpass',
    );
    expect(claps.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps sixteenth fills within the final eighth of a phrase', () => {
    const { noises, length } = capture(5, 4);
    const end = length * 4 - 1;
    expect(
      noises.some(({ step, filter }) => step > end && step < end + 1 && filter === 'bandpass'),
    ).toBe(true);
    expect(noises.every(({ step }) => step < length * 4)).toBe(true);
  });

  it('distinguishes the three-beat waltz answers from duple call and response', () => {
    const clapSteps = (size: number) =>
      capture(size)
        .noises.filter(({ filter, duration }) => filter === 'bandpass' && duration === 0.025)
        .map(({ step }) => Math.floor(step));
    expect(new Set(clapSteps(3))).toEqual(new Set([2, 4]));
    expect(new Set(clapSteps(2))).toEqual(new Set([2]));
  });

  it.each([0, 1, 2])('centers an audible sine sub under the bass in palette %i', (theme) => {
    const bass: { pitch: number; volume: number; options: VoiceOptions }[] = [];
    const instruments: ScoreInstruments = {
      note(pitch, _time, _duration, volume, _lane, options = {}) {
        if (options.cutoff === 200 || options.cutoff === 680) bass.push({ pitch, volume, options });
      },
      kick() {},
      noise() {},
    };
    scheduleStep(instruments, 0, 'pentris', theme, 0, 0);
    expect(bass).toHaveLength(2);
    expect(bass[0].volume).toBe(0.155);
    expect(bass[1].volume).toBe(0.075);
    expect(bass[1].pitch).toBeGreaterThanOrEqual(24);
    expect(bass[1].options).toMatchObject({ wave: 'sine', pan: 0 });
    expect(bass[0].options.pan).toBe(0);
    expect((bass[0].pitch - bass[1].pitch) % 12).toBe(0);
  });
});
