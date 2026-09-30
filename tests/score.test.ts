import { describe, expect, it } from 'vitest';
import * as score from '../src/score';
import type { Mode } from '../src/game/types';

describe('five and six folk score', () => {
  it.each([1, 2, 3, 4, 5, 6])('uses the promised meter for size %s', (size) => {
    const position = score.scorePosition('fusion', 0, [size]);
    expect(position.stepsPerBar).toBe(size === 6 ? 6 : size * 2);
    expect(position.pieceSize).toBe(size);
  });

  it('cycles custom Fusion sizes only at complete bar boundaries', () => {
    const sizes = [3, 5, 6];
    expect(score.scorePosition('fusion', 0, sizes).pieceSize).toBe(3);
    expect(score.scorePosition('fusion', 5, sizes).stepInBar).toBe(5);
    expect(score.scorePosition('fusion', 6, sizes).pieceSize).toBe(5);
    expect(score.scorePosition('fusion', 16, sizes).pieceSize).toBe(6);
    expect(score.scorePosition('fusion', 22, sizes).pieceSize).toBe(3);
  });

  it('keeps the hook continuous through one-cell bars', () => {
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
    expect(melody).toEqual([69, 64, 65, 67, 65, 64, 62]);
  });
  it.each([
    ['pentris', 10, 10],
    ['sextris', 6, 6],
    ['fusion', 10, 6],
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
      expect(kicks).toContain(mode === 'sextris' ? 3 : 6);
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
