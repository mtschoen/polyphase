import type { ScoreInstruments, ScorePosition } from './score';

/** Dance pulse follows each bar's meter; bass and open hats answer between kicks. */
export function scheduleGroove(
  instruments: ScoreInstruments,
  position: ScorePosition,
  chord: readonly number[],
  bassWave: OscillatorType,
  energy: number,
  time: number,
  phrase: number,
): void {
  const { bar, stepInBar, stepsPerBar, stepDuration, pieceSize } = position;
  const pulse = stepInBar % 2 === 0;
  const groupAccent = stepInBar === 0 || ((pieceSize === 5 || pieceSize === 6) && stepInBar === 6);
  if (pulse) instruments.kick(time, (groupAccent ? 0.255 : 0.225) + energy * 0.045, 'music');

  const bassAnswer = stepInBar % 2 === 1;
  if (groupAccent || bassAnswer) {
    const fifth = bassAnswer && stepInBar % 4 === 3;
    const pickup = bassAnswer && stepInBar === stepsPerBar - 1 && phrase % 4 === 3;
    const pitch = (fifth ? chord[2] : chord[0]) - 12 + (pickup ? 12 : 0);
    instruments.note(
      pitch,
      time,
      stepDuration * (bassAnswer ? 0.62 : 0.72),
      0.155 + energy * 0.022,
      'music',
      {
        wave: bassWave,
        attack: 0.004,
        release: 0.06,
        cutoff: 680 + energy * 550,
        pan: 0,
      },
    );
    // Keep the sub in an audible octave and centered beneath the melodic bass.
    const lowerOctave = pitch - 12;
    const subPitch = lowerOctave < 24 ? lowerOctave + 12 : lowerOctave;
    instruments.note(subPitch, time, stepDuration * 0.72, 0.075 + energy * 0.018, 'music', {
      wave: 'sine',
      attack: 0.003,
      release: 0.07,
      cutoff: 200,
      pan: 0,
    });
  }

  const backbeat =
    pieceSize === 1
      ? bar % 2 === 1 && stepInBar === 0
      : pieceSize === 3
        ? stepInBar === 2 || stepInBar === 4
        : pieceSize === 5
          ? stepInBar === 4 || stepInBar === 8
          : pieceSize === 6
            ? stepInBar === 2 || stepInBar === 8
            : stepInBar === 2 || (pieceSize === 4 && stepInBar === 6);
  if (backbeat) {
    // Three tight noise transients create a clap without samples or a lingering wash.
    for (let hit = 0; hit < 3; hit++)
      instruments.noise(
        time + hit * 0.012,
        hit === 2 ? 0.09 : 0.025,
        (hit === 0 ? 0.046 : 0.029) + energy * 0.009,
        1900 + hit * 450,
        'bandpass',
        'music',
      );
    instruments.note(45, time, 0.095, 0.025 + energy * 0.006, 'music', {
      attack: 0.002,
      release: 0.08,
      targetFrequency: 90,
    });
  }

  const openHat = stepInBar % 2 === 1;
  instruments.noise(
    time,
    openHat ? stepDuration * 0.38 : 0.024,
    openHat ? 0.045 + energy * 0.012 : 0.01 + energy * 0.005,
    openHat ? 6500 : 7800,
    'highpass',
    'music',
  );
  if (energy > 0.72)
    instruments.noise(time + stepDuration / 2, 0.022, 0.012, 8500, 'highpass', 'music');
  const loopBars = pieceSize === 1 ? 8 : 4;
  if (phrase % loopBars === loopBars - 1 && stepInBar === stepsPerBar - 1) {
    instruments.noise(time + stepDuration / 2, 0.045, 0.03, 2400, 'bandpass', 'music');
    instruments.noise(time + stepDuration * 0.75, 0.04, 0.038, 3200, 'bandpass', 'music');
  }
}
