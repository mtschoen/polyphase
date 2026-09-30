import assert from 'node:assert/strict';

/** Render short native graphs, with every allocated voice below the lane limits. */
export async function checkActionAudio(page) {
  const results = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio.ts');
    const { scheduleStep, chordForStep, scorePosition } = await import('/src/score.ts');
    const { scheduleEffect } = await import('/src/sound-effects.ts');
    const actions = ['move', 'rotate', 'softdrop', 'drop', 'lock', 'hold'];
    async function render(action, music, theme) {
      const context = new OfflineAudioContext(2, 43200, 48000);
      const nativeConstructor = window.AudioContext;
      const nativeRandom = Math.random;
      const sound = new AudioEngine();
      let seed = 29;
      try {
        window.AudioContext = function () {
          return context;
        };
        Math.random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 2 ** 32;
        };
        sound.setVolume(1);
        sound.playing = music;
        sound.initialize();
      } finally {
        window.AudioContext = nativeConstructor;
        Math.random = nativeRandom;
      }
      try {
        const instruments = {
          note: sound.note.bind(sound),
          kick: sound.kick.bind(sound),
          noise: sound.noise.bind(sound),
        };
        if (music)
          for (let step = 0; step < 2; step++)
            scheduleStep(
              instruments,
              step,
              'sextris',
              theme,
              1,
              0.03 + step * scorePosition('sextris', step, [6]).stepDuration,
              [6],
            );
        if (action)
          scheduleEffect(instruments, action, chordForStep('sextris', 0, theme, [6]), 0.03, 1);
        const retainedVoices = sound.voices.size;
        const buffer = await context.startRendering();
        return {
          channels: Array.from({ length: 2 }, (_, channel) => buffer.getChannelData(channel)),
          retainedVoices,
        };
      } finally {
        sound.dispose();
      }
    }
    const measurements = [];
    for (const theme of [0, 1, 2]) {
      const reference = await render(undefined, true, theme);
      for (const action of actions) {
        const isolated = await render(action, false, theme);
        const mixed = await render(action, true, theme);
        let peak = 0;
        let isolatedSquared = 0;
        let differenceSquared = 0;
        let finite = true;
        for (let channel = 0; channel < 2; channel++) {
          const solo = isolated.channels[channel];
          const samples = mixed.channels[channel];
          for (let index = 0; index < samples.length; index++) {
            peak = Math.max(peak, Math.abs(samples[index]), Math.abs(solo[index]));
            finite &&= Number.isFinite(samples[index]) && Number.isFinite(solo[index]);
            isolatedSquared += solo[index] ** 2;
            differenceSquared += (samples[index] - reference.channels[channel][index]) ** 2;
          }
        }
        measurements.push({
          action,
          theme,
          peak,
          finite,
          isolatedEnergy: Math.sqrt(isolatedSquared / 86400),
          mixedDifference: Math.sqrt(differenceSquared / 86400),
          retainedVoices: mixed.retainedVoices,
        });
      }
    }
    return measurements;
  });
  for (const result of results) {
    const label = `${result.action}, theme ${result.theme}`;
    assert.equal(result.finite, true, `${label}: samples must remain finite`);
    assert.ok(result.isolatedEnergy > 0.0005, `${label}: the isolated cue must produce audio`);
    assert.ok(result.mixedDifference > 0.0005, `${label}: music must not erase the cue`);
    assert.ok(result.peak < 0.95, `${label}: final output needs headroom at full volume`);
    assert.ok(result.retainedVoices < 40, `${label}: the probe must not evict queued voices`);
  }
  return results;
}
