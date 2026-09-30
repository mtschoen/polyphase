import type { AudioLane, VoiceOptions } from './audio';
import type { Mode } from './game/types';
export type SoundtrackMode = Mode | 'monotris' | 'ditris' | 'tritris' | 'tetris';
const DEFAULT_SIZES: Record<SoundtrackMode, readonly number[]> = {
  monotris: [1],
  ditris: [2],
  tritris: [3],
  tetris: [4],
  pentris: [5],
  sextris: [6],
  fusion: [5, 6],
};
/** Keep only distinct integer sizes 1..6; empty input restores the standard Fusion pair. */
export function normalizeMusicSizes(sizes: readonly number[]): number[] {
  const selected = [
    ...new Set(sizes.filter((size) => Number.isInteger(size) && size >= 1 && size <= 6)),
  ];
  return selected.length ? selected : [5, 6];
}
export function defaultMusicSizes(mode: SoundtrackMode): readonly number[] {
  return DEFAULT_SIZES[mode];
}
export function soundtrackForSizes(sizes: readonly number[]): {
  title: string;
  meter: string;
  tempo: string;
} {
  const selected = normalizeMusicSizes(sizes);
  return {
    title: selected.length === 1 ? `The ${selected[0]}-Cell Dance` : 'Polyphase Folk Circuit',
    meter: selected.map((size) => (size === 6 ? '6/8' : `${size}/4`)).join(' + '),
    tempo: selected.includes(6)
      ? selected.length === 1
        ? '96 dotted quarters/min'
        : '132 quarter / 96 dotted-quarter beats/min'
      : '132 quarter notes/min',
  };
}

/** Quarter-note pulse in Pentris. Sextris uses 96 dotted-quarter beats per minute. */
export const BEAT_DURATION = 60 / 132;
export const PAD_PANNING = [-0.65, 0.35, -0.25, 0.65] as const;
export const MELODY_WAVE: OscillatorType = 'triangle';
export const frequencyForNote = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** UI metadata reports the actual meter and beat unit. */
export const SOUNDTRACKS: Record<SoundtrackMode, { title: string; meter: string; tempo: string }> =
  {
    monotris: soundtrackForSizes([1]),
    ditris: soundtrackForSizes([2]),
    tritris: soundtrackForSizes([3]),
    tetris: soundtrackForSizes([4]),
    pentris: { title: 'The Fifth Step', meter: '5/4 · 3+2', tempo: '132 quarter notes/min' },
    sextris: { title: 'Six in the Current', meter: '6/8 · 3+3', tempo: '96 dotted quarters/min' },
    fusion: { title: 'Five Meets Six', meter: 'Alternating 5/4 + 6/8', tempo: '132 / 96' },
  };
const THEME_TRANSPOSITIONS = [-7, -5, -12] as const;
const PALETTES = [
  { wave: 'triangle', cutoff: 3600, bassWave: 'sawtooth' },
  { wave: 'sawtooth', cutoff: 2400, bassWave: 'triangle' },
  { wave: 'sine', cutoff: 2100, bassWave: 'triangle' },
] as const;
const HARMONY = [
  [57, 60, 64, 69], // A minor
  [62, 65, 69, 72], // D minor
  [53, 57, 60, 65], // F major
  [55, 59, 62, 67], // G major
  [52, 56, 59, 64], // E major, harmonic-minor cadence
  [60, 64, 67, 72], // C major
] as const;
const CHORD_PROGRESSION = [0, 0, 1, 0, 2, 5, 4, 0, 0, 3, 5, 2, 1, 0, 4, 0] as const;
type MelodyEvent = readonly [note: number, eighths: number];
// Traditional Korobeiniki, independently rephrased for these meters.
// Source: https://commons.wikimedia.org/wiki/File:Korobeiniki.svg (public-domain folk score).
// Harmony, bass, percussion, countermelody, form and synthesis here are original.
const FIVE_MELODY: readonly (readonly MelodyEvent[])[] = [
  [
    [76, 2],
    [71, 1],
    [72, 1],
    [74, 2],
    [72, 1],
    [71, 1],
    [69, 2],
  ],
  [
    [69, 2],
    [72, 1],
    [76, 1],
    [74, 2],
    [72, 1],
    [71, 1],
    [72, 2],
  ],
  [
    [74, 2],
    [76, 2],
    [72, 2],
    [69, 2],
    [69, 2],
  ],
  [
    [74, 3],
    [77, 1],
    [81, 2],
    [79, 1],
    [77, 1],
    [76, 2],
  ],
  [
    [72, 3],
    [76, 1],
    [74, 2],
    [72, 1],
    [71, 1],
    [71, 2],
  ],
  [
    [72, 2],
    [74, 2],
    [76, 2],
    [72, 2],
    [69, 2],
  ],
  [
    [69, 2],
    [72, 1],
    [76, 1],
    [74, 2],
    [72, 1],
    [71, 1],
    [68, 2],
  ],
  [
    [69, 6],
    [71, 1],
    [72, 1],
    [74, 2],
  ],
  [
    [76, 2],
    [72, 2],
    [69, 2],
    [71, 2],
    [72, 2],
  ],
  [
    [74, 2],
    [71, 2],
    [67, 2],
    [69, 2],
    [71, 2],
  ],
  [
    [72, 2],
    [69, 2],
    [64, 2],
    [67, 2],
    [69, 2],
  ],
  [
    [65, 2],
    [69, 2],
    [72, 2],
    [76, 2],
    [77, 2],
  ],
  [
    [74, 2],
    [77, 1],
    [81, 1],
    [79, 2],
    [77, 2],
    [74, 2],
  ],
  [
    [76, 2],
    [72, 1],
    [69, 1],
    [72, 2],
    [71, 2],
    [69, 2],
  ],
  [
    [71, 2],
    [68, 2],
    [64, 2],
    [68, 1],
    [71, 1],
    [74, 2],
  ],
  [
    [69, 6],
    [72, 1],
    [71, 1],
    [69, 2],
  ],
];
const SIX_MELODY: readonly (readonly MelodyEvent[])[] = [
  [
    [76, 2],
    [71, 1],
    [72, 1],
    [74, 1],
    [72, 1],
  ],
  [
    [71, 1],
    [69, 2],
    [69, 1],
    [72, 1],
    [76, 1],
  ],
  [
    [74, 2],
    [72, 1],
    [71, 1],
    [72, 1],
    [74, 1],
  ],
  [
    [76, 2],
    [72, 1],
    [69, 3],
  ],
  [
    [74, 2],
    [77, 1],
    [81, 1],
    [79, 1],
    [77, 1],
  ],
  [
    [76, 2],
    [72, 1],
    [76, 1],
    [74, 1],
    [72, 1],
  ],
  [
    [71, 2],
    [72, 1],
    [74, 1],
    [76, 1],
    [68, 1],
  ],
  [[69, 6]],
  [
    [76, 2],
    [72, 1],
    [69, 3],
  ],
  [
    [74, 2],
    [71, 1],
    [67, 3],
  ],
  [
    [72, 2],
    [69, 1],
    [64, 3],
  ],
  [
    [65, 1],
    [69, 1],
    [72, 1],
    [76, 2],
    [77, 1],
  ],
  [
    [74, 2],
    [77, 1],
    [79, 1],
    [77, 1],
    [74, 1],
  ],
  [
    [76, 2],
    [72, 1],
    [71, 1],
    [72, 1],
    [69, 1],
  ],
  [
    [71, 2],
    [68, 1],
    [64, 1],
    [68, 1],
    [71, 1],
  ],
  [[69, 6]],
];
export interface ScorePosition {
  bar: number;
  stepInBar: number;
  stepsPerBar: number;
  stepDuration: number;
  pieceSize: number;
}
/** Integer steps are eighth notes; Fusion changes meter only at complete bar boundaries. */
export function scorePosition(
  mode: SoundtrackMode,
  sequenceStep: number,
  sizes?: readonly number[],
): ScorePosition {
  const selected = sizes ? normalizeMusicSizes(sizes) : DEFAULT_SIZES[mode];
  const lengths = selected.map((size) => (size === 6 ? 6 : size * 2));
  const cycleLength = lengths.reduce((total, length) => total + length, 0);
  let stepInBar = sequenceStep % cycleLength;
  let index = 0;
  while (stepInBar >= lengths[index]) {
    stepInBar -= lengths[index];
    index++;
  }
  const bar = Math.floor(sequenceStep / cycleLength) * selected.length + index;
  const compound = selected[index] === 6;
  return {
    bar,
    stepInBar,
    stepsPerBar: lengths[index],
    stepDuration: compound ? 60 / 96 / 3 : BEAT_DURATION / 2,
    pieceSize: selected[index],
  };
}
function continuousMelody(mode: SoundtrackMode, sizes?: readonly number[]): boolean {
  const selected = sizes ? normalizeMusicSizes(sizes) : DEFAULT_SIZES[mode];
  return selected.length === 1
    ? selected[0] < 5
    : !(selected.length === 2 && selected[0] === 5 && selected[1] === 6);
}
export function chordForStep(
  mode: SoundtrackMode,
  sequenceStep: number,
  theme: number,
  sizes?: readonly number[],
): readonly number[] {
  const { bar } = scorePosition(mode, sequenceStep, sizes);
  const phrase = continuousMelody(mode, sizes) ? Math.floor(sequenceStep / 10) : bar;
  return HARMONY[CHORD_PROGRESSION[phrase % 16]].map((note) => note + THEME_TRANSPOSITIONS[theme]);
}
export interface ScoreInstruments {
  note(
    note: number,
    time: number,
    duration: number,
    volume: number,
    lane: AudioLane,
    options?: VoiceOptions,
  ): void;
  kick(time: number, volume: number, lane: AudioLane): void;
  noise(
    time: number,
    duration: number,
    volume: number,
    frequency: number,
    filterType: BiquadFilterType,
    lane: AudioLane,
    targetFrequency?: number,
  ): void;
}
/** Schedule one eighth-note slice. Lead and groove remain present even at zero pressure. */
export function scheduleStep(
  instruments: ScoreInstruments,
  sequenceStep: number,
  mode: SoundtrackMode,
  theme: number,
  energy: number,
  time: number,
  sizes?: readonly number[],
): void {
  const { bar, stepInBar, stepsPerBar, stepDuration, pieceSize } = scorePosition(
    mode,
    sequenceStep,
    sizes,
  );
  const chord = chordForStep(mode, sequenceStep, theme, sizes);
  const palette = PALETTES[theme];
  const compound = pieceSize === 6;
  const secondAccent = compound ? 3 : pieceSize === 5 ? 6 : pieceSize === 4 ? 4 : stepsPerBar;
  const continuous = continuousMelody(mode, sizes);
  const phraseIndex = continuous ? Math.floor(sequenceStep / 10) : bar;
  const phrase = phraseIndex % 16;
  const variation = Math.floor(phraseIndex / 16) % 3;
  const melody = (continuous ? FIVE_MELODY : compound ? SIX_MELODY : FIVE_MELODY)[phrase];
  const melodyStep = continuous ? sequenceStep % 10 : stepInBar;
  let onset = 0;
  for (const [pitch, eighths] of melody) {
    if (onset === melodyStep) {
      const note = pitch + THEME_TRANSPOSITIONS[theme];
      instruments.note(note, time, eighths * stepDuration * 0.9, 0.105 + energy * 0.035, 'music', {
        wave: palette.wave,
        attack: 0.008,
        release: 0.07,
        pan: 0.12,
        cutoff: palette.cutoff + energy * 2300,
      });
      if (energy > 0.7 || variation === 2)
        instruments.note(
          note + 12,
          time,
          eighths * stepDuration * 0.65,
          0.021 + energy * 0.008,
          'music',
          {
            wave: 'triangle',
            attack: 0.006,
            release: 0.06,
            pan: -0.2,
            cutoff: 4000,
          },
        );
    }
    onset += eighths;
  }
  if (stepInBar === 0) {
    chord.forEach((note, index) =>
      instruments.note(note, time, stepsPerBar * stepDuration * 0.94, 0.019, 'music', {
        wave: 'triangle',
        attack: 0.06,
        release: 0.18,
        pan: PAD_PANNING[index],
        cutoff: 850 + energy * 1000,
      }),
    );
  }
  const accent = stepInBar === 0 || stepInBar === secondAccent;
  if (accent) {
    instruments.kick(time, 0.19 + energy * 0.055, 'music');
    instruments.note(chord[0] - 12, time, stepDuration * (compound ? 2.5 : 1.7), 0.125, 'music', {
      wave: palette.bassWave,
      attack: 0.006,
      release: 0.1,
      cutoff: 550 + energy * 500,
    });
  } else if (stepInBar % 2 === 0 || (compound && stepInBar === 5)) {
    instruments.note(chord[2] - 12, time, stepDuration * 0.7, 0.065, 'music', {
      wave: palette.bassWave,
      attack: 0.005,
      release: 0.05,
      cutoff: 600,
    });
  }
  const snare = compound
    ? stepInBar === 3
    : pieceSize === 5
      ? stepInBar === 4 || stepInBar === 8
      : pieceSize > 1 && (stepInBar === 2 || (pieceSize === 4 && stepInBar === 6));
  if (snare) {
    instruments.noise(time, 0.12, 0.048 + energy * 0.025, 1800, 'bandpass', 'music');
    instruments.note(45, time, 0.08, 0.023, 'music', {
      attack: 0.002,
      release: 0.07,
      targetFrequency: 90,
    });
  }
  instruments.noise(
    time,
    0.035,
    accent ? 0.023 : 0.011 + energy * 0.009,
    7200,
    'highpass',
    'music',
  );
  // A quieter broken-chord answer and pressure-driven sixteenth-note fills.
  if (stepInBar % 2 === 1 && (phrase >= 8 || energy > 0.28 || variation === 1)) {
    instruments.note(
      chord[(stepInBar + bar) % 4] + 12,
      time,
      stepDuration * 0.62,
      0.027 + energy * 0.009,
      'music',
      {
        wave: 'triangle',
        attack: 0.004,
        release: 0.04,
        pan: -0.45,
        cutoff: 2200 + energy * 1800,
      },
    );
  }
  if (energy > 0.72)
    instruments.noise(time + stepDuration / 2, 0.026, 0.013, 8200, 'highpass', 'music');
  if (phrase % 4 === 3 && stepInBar === stepsPerBar - 1)
    instruments.noise(time + stepDuration / 2, 0.065, 0.032, 2600, 'bandpass', 'music');
}
