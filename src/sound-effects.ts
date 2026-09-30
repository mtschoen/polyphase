import type { VoiceOptions } from './audio';
import { getClearTier } from './clear-tiers';
import { frequencyForNote, MELODY_WAVE, PAD_PANNING } from './score';

export type SoundEffect =
  'move' | 'rotate' | 'drop' | 'lock' | 'clear' | 'hold' | 'resonance' | 'gameover' | 'level';

/** A deterministic score for original effects, independent of native audio nodes. */
export interface EffectInstruments {
  note: (
    note: number,
    time: number,
    duration: number,
    volume: number,
    lane: 'effect',
    options?: VoiceOptions,
  ) => void;
  kick: (time: number, volume: number, lane: 'effect') => void;
  noise: (
    time: number,
    duration: number,
    volume: number,
    frequency: number,
    filterType: BiquadFilterType,
    lane: 'effect',
    targetFrequency?: number,
  ) => void;
}

function clearStinger(
  instruments: EffectInstruments,
  chord: readonly number[],
  time: number,
  lines: number,
): number {
  const power = getClearTier(lines).power;
  if (power === 1) {
    instruments.note(chord[0] + 12, time, 0.18, 0.09, 'effect', {
      wave: 'triangle',
      cutoff: 3100,
      release: 0.16,
      targetFrequency: frequencyForNote(chord[0] + 7),
    });
    instruments.noise(time, 0.035, 0.018, 2100, 'bandpass', 'effect');
    return 0;
  }

  // The impact stays brief. Harmony supplies the long tail, leaving the melody audible.
  instruments.note(chord[0] - 12, time, 0.18 + power * 0.065, 0.045 + power * 0.016, 'effect', {
    attack: 0.003,
    release: 0.17 + power * 0.04,
    cutoff: 420,
    targetFrequency: frequencyForNote(chord[0] - 24),
  });
  instruments.noise(
    time,
    0.055 + power * 0.018,
    0.014 + power * 0.004,
    1200 + power * 250,
    'lowpass',
    'effect',
  );
  const hits = power * 2 - 1;
  for (let index = 0; index < hits; index++) {
    instruments.note(
      chord[index % chord.length] + 12 + Math.floor(index / chord.length) * 12,
      time + 0.035 + index * 0.045,
      0.14 + power * 0.065,
      0.035 + power * 0.004,
      'effect',
      {
        wave: MELODY_WAVE,
        attack: 0.004,
        release: 0.1 + power * 0.05,
        pan: PAD_PANNING[index % PAD_PANNING.length],
        cutoff: 2600 + power * 450,
      },
    );
  }
  const tailTime = time + hits * 0.045 + 0.07;
  chord.slice(0, Math.min(power, chord.length)).forEach((note, index) => {
    instruments.note(note + 12, tailTime, 0.19 + power * 0.11, 0.029 + power * 0.003, 'effect', {
      wave: MELODY_WAVE,
      attack: 0.025,
      release: 0.15 + power * 0.1,
      pan: PAD_PANNING[index],
      cutoff: 3300 + power * 300,
    });
  });
  return power >= 3 ? 0.16 + power * 0.075 : 0;
}

/** Return a short music-duck duration for large clears only. */
export function scheduleEffect(
  instruments: EffectInstruments,
  type: SoundEffect,
  chord: readonly number[],
  time: number,
  amount: number,
): number {
  switch (type) {
    case 'move':
      instruments.note(chord[2] + 12, time, 0.075, 0.022, 'effect', { pan: -0.2, cutoff: 1700 });
      break;
    case 'rotate':
      instruments.note(chord[3] + 12, time, 0.13, 0.026, 'effect', {
        wave: MELODY_WAVE,
        pan: 0.25,
        cutoff: 2400,
        targetFrequency: frequencyForNote(chord[3] + 14),
      });
      break;
    case 'drop':
      instruments.note(chord[0] + 12, time, 0.12, 0.025, 'effect', {
        cutoff: 1200,
        targetFrequency: frequencyForNote(chord[0] - 12),
      });
      instruments.noise(time, 0.1, 0.024, 1800, 'bandpass', 'effect', 400);
      break;
    case 'lock':
      instruments.note(chord[0] - 12, time, 0.13, 0.045, 'effect', {
        wave: MELODY_WAVE,
        cutoff: 380,
      });
      instruments.noise(time, 0.045, 0.013, 680, 'lowpass', 'effect');
      break;
    case 'hold':
      instruments.note(chord[1] + 12, time, 0.22, 0.036, 'effect', { pan: -0.3 });
      instruments.note(chord[2] + 12, time + 0.06, 0.3, 0.032, 'effect', { pan: 0.3 });
      break;
    case 'clear':
      return clearStinger(instruments, chord, time, amount);
    case 'level':
      [...chord, chord[0] + 12].forEach((note, index) =>
        instruments.note(note + 12, time + index * 0.11, 0.9, 0.042, 'effect', {
          pan: index * 0.25 - 0.5,
        }),
      );
      break;
    case 'resonance':
      instruments.noise(time, 2.4, 0.14, 260, 'bandpass', 'effect', 8500);
      instruments.note(chord[0] - 12, time, 2.4, 0.13, 'effect', { attack: 0.1, release: 1.5 });
      chord.forEach((note, index) => {
        instruments.note(note + 12, time + 0.12 * index, 2.5, 0.052, 'effect', {
          wave: MELODY_WAVE,
          attack: 0.18,
          release: 1.6,
          pan: PAD_PANNING[index],
          cutoff: 4200,
        });
        instruments.note(note + 24, time + 0.5 + 0.08 * index, 1.8, 0.024, 'effect', {
          pan: -PAD_PANNING[index],
        });
      });
      break;
    case 'gameover':
      [chord[3], chord[2], chord[1], chord[0]].forEach((note, index) =>
        instruments.note(note, time + index * 0.18, 1.6, 0.06, 'effect', {
          wave: MELODY_WAVE,
          cutoff: 1100,
        }),
      );
      break;
  }
  return 0;
}
