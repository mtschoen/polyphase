import assert from 'node:assert/strict';

export async function checkClubPump(page) {
  const result = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio.ts');
    const context = new OfflineAudioContext(2, 57600, 48000);
    const nativeConstructor = window.AudioContext;
    const sound = new AudioEngine();
    try {
      window.AudioContext = function () {
        return context;
      };
      sound.initialize();
    } finally {
      window.AudioContext = nativeConstructor;
    }
    try {
      // Isolate the real melodic bus so percussion cannot conceal a missing gain dip.
      sound.master.disconnect();
      sound.musicBus.send.gain.value = 0;
      sound.musicBus.pump.connect(context.destination);
      const tone = context.createOscillator();
      tone.frequency.value = 220;
      tone.connect(sound.musicBus.dry);
      tone.start(0);
      tone.stop(1.1);
      sound.playing = true;
      sound.kick(0.2, 0.3, 'music');
      sound.kick(0.6, 0.3, 'music');
      const rendered = await context.startRendering();
      const samples = rendered.getChannelData(0);
      const energy = (start, end) => {
        const first = Math.round(start * rendered.sampleRate);
        const last = Math.round(end * rendered.sampleRate);
        let total = 0;
        for (let index = first; index < last; index++) total += samples[index] ** 2;
        return Math.sqrt(total / (last - first));
      };
      return {
        before: energy(0.1, 0.15),
        firstDip: energy(0.213, 0.23),
        firstRecovery: energy(0.52, 0.56),
        secondDip: energy(0.613, 0.63),
        secondRecovery: energy(0.96, 1),
        finite: samples.every(Number.isFinite),
      };
    } finally {
      sound.dispose();
    }
  });
  assert.equal(result.finite, true);
  assert.ok(result.before > 0.1, 'The melodic probe must be audible before the kick');
  for (const dip of [result.firstDip, result.secondDip])
    assert.ok(dip < result.before * 0.35, 'Each kick must audibly duck the melodic bus');
  for (const recovery of [result.firstRecovery, result.secondRecovery])
    assert.ok(recovery > result.before * 0.9, 'The melodic bus must swell back between kicks');
  return result;
}

export async function checkOutputGain(page) {
  const results = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio.ts');
    const { scheduleStep, scorePosition, chordForStep } = await import('/src/score.ts');
    const { scheduleEffect } = await import('/src/sound-effects.ts');
    const results = [];
    for (const size of [1, 2, 3, 4, 5, 6]) {
      for (const theme of [0, 1, 2]) {
        const measurements = [];
        for (const reference of [true, false]) {
          const context = new OfflineAudioContext(2, 96000, 48000);
          const nativeConstructor = window.AudioContext;
          const nativeRandom = Math.random;
          const sound = new AudioEngine();
          let seed = 17;
          try {
            window.AudioContext = function () {
              return context;
            };
            Math.random = () => {
              seed = (seed * 1664525 + 1013904223) >>> 0;
              return seed / 2 ** 32;
            };
            sound.setVolume(1);
            sound.initialize();
          } finally {
            window.AudioContext = nativeConstructor;
            Math.random = nativeRandom;
          }
          try {
            if (reference) sound.output.gain.value = 1;
            sound.playing = true;
            const instruments = {
              note: sound.note.bind(sound),
              kick: sound.kick.bind(sound),
              noise: sound.noise.bind(sound),
            };
            const sizes = [size];
            for (let step = 0; step < 2; step++)
              scheduleStep(
                instruments,
                step,
                'fusion',
                theme,
                1,
                0.03 + step * scorePosition('fusion', step, sizes).stepDuration,
                sizes,
              );
            scheduleEffect(instruments, 'clear', chordForStep('fusion', 0, theme, sizes), 0.03, 6);
            const retainedVoices = sound.voices.size;
            const rendered = await context.startRendering();
            let peak = 0;
            let squared = 0;
            for (let channel = 0; channel < rendered.numberOfChannels; channel++)
              for (const sample of rendered.getChannelData(channel)) {
                peak = Math.max(peak, Math.abs(sample));
                squared += sample * sample;
              }
            measurements.push({
              peak,
              energy: Math.sqrt(squared / (rendered.length * rendered.numberOfChannels)),
              retainedVoices,
            });
          } finally {
            sound.dispose();
          }
        }
        results.push({ size, theme, reference: measurements[0], boosted: measurements[1] });
      }
    }
    return results;
  });
  for (const { reference, boosted } of results) {
    assert.ok(
      boosted.peak > 0.01 && boosted.peak < 0.95,
      'Full-volume impacts need clean headroom',
    );
    assert.ok(boosted.retainedVoices < 48, 'The probe must not evict scheduled voices');
    const ratio = boosted.energy / reference.energy;
    assert.ok(
      ratio > 1.49 && ratio < 1.51,
      'Actual output must rise by 50%, including at 100% volume',
    );
  }
  return results;
}
