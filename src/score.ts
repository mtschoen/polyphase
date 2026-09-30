import type { AudioLane, VoiceOptions } from './audio';

export const BEAT_DURATION = 60 / 92;
export const STEP_DURATION = BEAT_DURATION / 2;
export const CHORDS: readonly (readonly (readonly number[])[])[] = [
  [
    [50, 53, 57, 64],
    [46, 53, 57, 60],
    [48, 52, 55, 62],
    [43, 50, 53, 57],
  ],
  [
    [52, 55, 59, 66],
    [48, 55, 59, 62],
    [50, 54, 57, 64],
    [45, 52, 55, 59],
  ],
  [
    [45, 48, 52, 59],
    [41, 48, 52, 55],
    [43, 47, 50, 57],
    [38, 45, 48, 52],
  ],
];
const ARPEGGIO = [0, 2, 1, 3, 2, 0, 3, 1] as const;
export const PAD_PANNING = [-0.65, 0.35, -0.25, 0.65] as const;

export const frequencyForNote = (note: number): number => 440 * 2 ** ((note - 69) / 12);
export const MELODY_WAVE: OscillatorType = 'triangle';
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
export function scheduleStep(
  instruments: ScoreInstruments,
  sequenceStep: number,
  chord: readonly number[],
  energy: number,
  time: number,
): void {
  const step = sequenceStep % 8;
  if (sequenceStep % 32 === 0) {
    chord.forEach((note, index) => {
      const duration = BEAT_DURATION * 16 + 1.2;
      instruments.note(note, time, duration, 0.036, 'music', {
        attack: 1.25,
        release: 1.5,
        pan: PAD_PANNING[index],
        detune: -5,
        cutoff: 900 + energy * 1700,
      });
      instruments.note(note, time, duration, 0.019, 'music', {
        wave: MELODY_WAVE,
        attack: 1.6,
        release: 1.5,
        pan: -PAD_PANNING[index],
        detune: 5,
        cutoff: 700 + energy * 1200,
      });
    });
  }
  if (step === 0 || step === 4 || (energy > 0.7 && step === 7)) {
    instruments.kick(time, 0.09 + energy * 0.07, 'music');
    instruments.note(chord[0] - 12, time + 0.025, BEAT_DURATION * 1.6, 0.09, 'music', {
      wave: MELODY_WAVE,
      attack: 0.025,
      release: 0.5,
      cutoff: 420 + energy * 300,
    });
  }
  if ((step === 2 || step === 6) && energy > 0.12) {
    instruments.noise(time, 0.15, 0.028 + energy * 0.027, 1750, 'bandpass', 'music');
    instruments.note(45, time, 0.12, 0.02, 'music', { cutoff: 500, targetFrequency: 90 });
  }
  if ((step % 2 === 1 && energy > 0.2) || energy > 0.72) {
    instruments.noise(
      time,
      step === 7 ? 0.1 : 0.055,
      0.015 + energy * 0.018,
      6800,
      'highpass',
      'music',
    );
  }
  const arpeggioSpacing = energy > 0.65 ? 1 : energy > 0.25 ? 2 : 4;
  if (sequenceStep % arpeggioSpacing === 0) {
    const position = ARPEGGIO[sequenceStep % ARPEGGIO.length];
    instruments.note(chord[position] + 12, time, 0.46, 0.025 + energy * 0.019, 'music', {
      wave: MELODY_WAVE,
      cutoff: 1600 + energy * 2800,
      pan: Math.sin(sequenceStep * 0.8) * 0.6,
    });
  }
}
