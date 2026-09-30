import { describe, expect, it } from 'vitest';
import * as score from '../src/score';
import type { Mode } from '../src/game/types';

describe('five and six folk score', () => {
  it.each([1, 2, 3, 4, 5, 6])('uses the promised meter for size %s', (size) => {
    const position = score.scorePosition('fusion', 0, [size]);
    expect(position.stepsPerBar).toBe(size * 2);
    expect(position.pieceSize).toBe(size);
  });

  it('cycles custom Fusion sizes only at complete bar boundaries', () => {
    const sizes = [3, 5, 6];
    expect(score.scorePosition('fusion', 0, sizes).pieceSize).toBe(3);
    expect(score.scorePosition('fusion', 5, sizes).stepInBar).toBe(5);
    expect(score.scorePosition('fusion', 6, sizes).pieceSize).toBe(5);
    expect(score.scorePosition('fusion', 16, sizes).pieceSize).toBe(6);
    expect(score.scorePosition('fusion', 27, sizes).stepInBar).toBe(11);
    expect(score.scorePosition('fusion', 28, sizes).pieceSize).toBe(3);
  });

  it('progresses the folk hook with one quarter-note pulse per one-cell bar', () => {
    const melody: number[] = [];
    const instruments: score.ScoreInstruments = {
      note(note, _time, _duration, _volume, _lane, options) {
        if (options?.pan === 0.12) melody.push(note);
      },
      kick() {},
      noise() {},
    };
    for (let step = 0; step < 10; step++)
      score.scheduleStep(instruments, step, 'monotris', 0, 0, step, [1]);
    expect(melody).toEqual([69, 64, 65, 67, 65]);
  });
  it.each([
    ['pentris', 10, 10],
    ['sextris', 12, 12],
    ['fusion', 10, 12],
  ] as const)('%s uses complete bars with its promised meter', (mode, first, second) => {
    expect(score).toHaveProperty('scorePosition');
    expect(score.scorePosition(mode, 0).stepsPerBar).toBe(first);
    expect(score.scorePosition(mode, first).stepsPerBar).toBe(second);
    expect(score.scorePosition(mode, first).stepInBar).toBe(0);
    expect(score.scorePosition(mode, first).bar).toBe(1);
  });

  it.each(['pentris', 'sextris', 'fusion'] as Mode[])(
    '%s starts with the recognizable folk hook and audible rhythm at low intensity',
    (mode) => {
      expect(score).toHaveProperty('scorePosition');
      const melody: number[] = [];
      const kicks: number[] = [];
      const instruments: score.ScoreInstruments = {
        note(note, _time, _duration, _volume, _lane, options) {
          if (options?.pan === 0.12) melody.push(note);
        },
        kick(time) {
          kicks.push(time);
        },
        noise() {},
      };
      const length = score.scorePosition(mode, 0).stepsPerBar;
      for (let step = 0; step < length; step++)
        score.scheduleStep(instruments, step, mode, 0, 0, step);
      expect(melody.slice(0, 3)).toEqual([69, 64, 65]);
      expect(kicks).toContain(0);
      expect(kicks).toContain(6);
    },
  );

  it('schedules richer instrumentation as pressure rises without changing the tune or meter', () => {
    expect(score).toHaveProperty('scorePosition');
    const capture = (energy: number) => {
      const notes: number[] = [];
      const instruments: score.ScoreInstruments = {
        note(note) {
          notes.push(note);
        },
        kick() {},
        noise() {},
      };
      for (let step = 0; step < 80; step++)
        score.scheduleStep(instruments, step, 'fusion', 1, energy, step);
      return notes;
    };
    expect(capture(0.95).length).toBeGreaterThan(capture(0).length);
  });
});

function captureLead(size: number, start: number, length: number) {
  const lead: { note: number; step: number; duration: number }[] = [];
  let currentStep = 0;
  const instruments: score.ScoreInstruments = {
    note(note, _time, duration, _volume, _lane, options) {
      if (options?.pan === 0.12) lead.push({ note, step: currentStep - start, duration });
    },
    kick() {},
    noise() {},
  };
  for (currentStep = start; currentStep < start + length; currentStep++) {
    score.scheduleStep(instruments, currentStep, 'fusion', 0, 0, currentStep, [size]);
  }
  return lead;
}

describe('concise meter-specific folk loops', () => {
  it.each([
    [1, [0]],
    [2, [0, 3]],
    [3, [0, 2, 3, 4]],
    [4, [0, 2, 3, 4, 6, 7]],
    [5, [0, 2, 3, 4, 6, 7, 8]],
    [6, [0, 2, 4, 6, 8, 10]],
  ] as const)('gives size %i its own audible lead rhythm', (size, onsets) => {
    const lead = captureLead(size, 0, size * 2);
    expect(lead.map(({ step }) => step)).toEqual(onsets);
    expect(lead.reduce((total, note) => total + note.duration / 0.9, 0)).toBeCloseTo(
      size * score.BEAT_DURATION,
    );
    expect(
      lead.every(
        ({ step, duration }) =>
          (step * score.BEAT_DURATION) / 2 + duration <= size * score.BEAT_DURATION,
      ),
    ).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6])(
    'repeats the exact short lead and harmony loop for size %i',
    (size) => {
      const bars = size === 1 ? 8 : 4;
      const length = bars * size * 2;
      expect(captureLead(size, length, length)).toEqual(captureLead(size, 0, length));
      for (let bar = 0; bar < bars; bar++) {
        expect(score.chordForStep('fusion', length + bar * size * 2, 2, [size])).toEqual(
          score.chordForStep('fusion', bar * size * 2, 2, [size]),
        );
      }
    },
  );

  it('keeps duple call and response distinct and metadata truthful for six quarters', () => {
    expect(captureLead(2, 4, 4).map(({ step }) => step)).toEqual([0, 1, 2]);
    expect(score.soundtrackForSizes([6])).toMatchObject({
      meter: '6/4',
      tempo: '132 quarter notes/min',
    });
    expect(score.SOUNDTRACKS.sextris.meter).toContain('6/4');
    expect(score.SOUNDTRACKS.fusion.meter).toContain('6/4');
  });

  it('starts each selected Fusion size with its own first phrase at bar boundaries', () => {
    for (const [start, size] of [
      [0, 3],
      [6, 5],
      [16, 6],
    ]) {
      const pitches: number[] = [];
      const instruments: score.ScoreInstruments = {
        note(note, _time, _duration, _volume, _lane, options) {
          if (options?.pan === 0.12) pitches.push(note);
        },
        kick() {},
        noise() {},
      };
      for (let step = start; step < start + size * 2; step++)
        score.scheduleStep(instruments, step, 'fusion', 0, 0, step, [3, 5, 6]);
      expect(pitches).toEqual(captureLead(size, 0, size * 2).map(({ note }) => note));
    }
  });
});
