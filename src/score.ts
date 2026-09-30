import type { AudioLane, VoiceOptions } from './audio';
import type { Mode } from './game/types';
import { scheduleGroove } from './groove';
import { melodyForBar } from './score-melodies';
export type SoundtrackMode = Mode | 'monotris' | 'ditris' | 'tritris' | 'tetris';
const QUARTER_NOTES_PER_MINUTE = 132;
const TEMPO_LABEL = `${QUARTER_NOTES_PER_MINUTE} quarter notes/min`;
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
    meter: selected.map((size) => `${size}/4`).join(' + '),
    tempo: TEMPO_LABEL,
  };
}

/** Every mode shares this quarter-note tempo; each bar contains its piece count in beats. */
export const BEAT_DURATION = 60 / QUARTER_NOTES_PER_MINUTE;
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
    pentris: { title: 'The Fifth Step', meter: '5/4 · 3+2', tempo: TEMPO_LABEL },
    sextris: { title: 'Six in the Current', meter: '6/4 · 3+3', tempo: TEMPO_LABEL },
    fusion: {
      title: 'Five Meets Six',
      meter: 'Alternating 5/4 + 6/4',
      tempo: TEMPO_LABEL,
    },
  };
const THEME_TRANSPOSITIONS = [-7, -5, -12] as const;
const PALETTES = [
  { wave: MELODY_WAVE, cutoff: 3600, bassWave: 'sawtooth' },
  { wave: 'sawtooth', cutoff: 2400, bassWave: MELODY_WAVE },
  { wave: 'sine', cutoff: 2100, bassWave: MELODY_WAVE },
] as const;
const HARMONY = [
  [57, 60, 64, 69], // A minor
  [62, 65, 69, 72], // D minor
] as const;
const CHORD_PROGRESSION = [0, 0, 1, 0] as const;
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
  const lengths = selected.map((size) => size * 2);
  const cycleLength = lengths.reduce((total, length) => total + length, 0);
  let stepInBar = sequenceStep % cycleLength;
  let index = 0;
  while (stepInBar >= lengths[index]) {
    stepInBar -= lengths[index];
    index++;
  }
  const bar = Math.floor(sequenceStep / cycleLength) * selected.length + index;
  return {
    bar,
    stepInBar,
    stepsPerBar: lengths[index],
    stepDuration: BEAT_DURATION / 2,
    pieceSize: selected[index],
  };
}
export function chordForStep(
  mode: SoundtrackMode,
  sequenceStep: number,
  theme: number,
  sizes?: readonly number[],
): readonly number[] {
  const { bar, pieceSize } = scorePosition(mode, sequenceStep, sizes);
  const selected = sizes ? normalizeMusicSizes(sizes) : DEFAULT_SIZES[mode];
  const phraseBar = Math.floor(bar / selected.length);
  const phrase = pieceSize === 1 ? Math.floor(phraseBar / 2) : phraseBar;
  return HARMONY[CHORD_PROGRESSION[phrase % CHORD_PROGRESSION.length]].map(
    (note) => note + THEME_TRANSPOSITIONS[theme],
  );
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
  const selected = sizes ? normalizeMusicSizes(sizes) : DEFAULT_SIZES[mode];
  const phraseIndex = Math.floor(bar / selected.length);
  const melody = melodyForBar(pieceSize, phraseIndex);
  const melodyStep = stepInBar;
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
      if (energy > 0.7)
        instruments.note(
          note + 12,
          time,
          eighths * stepDuration * 0.65,
          0.021 + energy * 0.008,
          'music',
          {
            wave: MELODY_WAVE,
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
        wave: MELODY_WAVE,
        attack: 0.06,
        release: 0.18,
        pan: PAD_PANNING[index],
        cutoff: 850 + energy * 1000,
      }),
    );
  }
  scheduleGroove(
    instruments,
    { bar: phraseIndex, stepInBar, stepsPerBar, stepDuration, pieceSize },
    chord,
    palette.bassWave,
    energy,
    time,
    phraseIndex,
  );
}
