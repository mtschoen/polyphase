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
