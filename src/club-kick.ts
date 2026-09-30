import type { VoiceOptions } from './audio';

interface ClubInstruments {
  note(
    note: number,
    time: number,
    duration: number,
    volume: number,
    lane: 'music',
    options: VoiceOptions,
    percussion: true,
  ): void;
  noise(
    time: number,
    duration: number,
    volume: number,
    frequency: number,
    filter: BiquadFilterType,
    lane: 'music',
  ): void;
}

/** Gain automation gives melodic dry and echo paths an audible kick-driven recovery. */
export function scheduleMusicPump(gain: AudioParam, time: number): void {
  gain.cancelAndHoldAtTime(time);
  gain.linearRampToValueAtTime(0.22, time + 0.008);
  gain.setValueAtTime(0.22, time + 0.035);
  gain.linearRampToValueAtTime(1, time + 0.3);
}

/** Tight pitched body, low sub sweep and a tiny click share the kick onset. */
export function scheduleClubKick(instruments: ClubInstruments, time: number, volume: number): void {
  instruments.note(
    50,
    time,
    0.11,
    volume * 0.78,
    'music',
    {
      attack: 0.001,
      release: 0.105,
      targetFrequency: 50,
      cutoff: 900,
    },
    true,
  );
  instruments.note(
    33,
    time,
    0.28,
    volume * 0.85,
    'music',
    {
      attack: 0.002,
      release: 0.275,
      targetFrequency: 41,
      cutoff: 180,
    },
    true,
  );
  instruments.noise(time, 0.014, volume * 0.09, 2200, 'highpass', 'music');
}
