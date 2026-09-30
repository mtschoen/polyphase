import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { checkParticles } from './particle-checks.mjs';
import { checkClearEscalation } from './clear-checks.mjs';
import { checkClubPump } from './club-checks.mjs';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.POLYPHASE_BROWSER,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Enter the flow' }).click();
  await page.keyboard.press('p');
  await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio.ts');
    const sound = new AudioEngine();
    await sound.start();
    const analyser = sound.context.createAnalyser();
    sound.master.connect(analyser);
    sound.setVolume(0.6);
    sound.setIntensity(0.9);
    sound.setPlaying(true);
    window.mediaProbe = { sound, analyser, samples: new Float32Array(analyser.fftSize), peak: 0 };
  });
  await page.waitForFunction(() => {
    const probe = window.mediaProbe;
    probe.analyser.getFloatTimeDomainData(probe.samples);
    probe.peak = Math.max(...probe.samples.map(Math.abs));
    return probe.peak > 0.001;
  });
  const musicPeak = await page.evaluate(() => window.mediaProbe.peak);
  assert.ok(Number.isFinite(musicPeak));
  const arrangements = [];
  for (const sizes of [[1], [2], [3], [4], [5], [6], [3, 5, 6]]) {
    await page.evaluate(() => window.mediaProbe.sound.setMuted(true));
    await page.waitForFunction(() => {
      const probe = window.mediaProbe;
      probe.analyser.getFloatTimeDomainData(probe.samples);
      return probe.samples.every((sample) => Math.abs(sample) < 0.00001);
    });
    await page.evaluate((selected) => {
      const sound = window.mediaProbe.sound;
      sound.setPieceSizes(selected);
      sound.setMuted(false);
    }, sizes);
    await page.waitForFunction(() => {
      const probe = window.mediaProbe;
      probe.analyser.getFloatTimeDomainData(probe.samples);
      return probe.samples.some((sample) => Math.abs(sample) > 0.001);
    });
    arrangements.push(sizes.join('+'));
  }
  await page.evaluate(() => window.mediaProbe.sound.setMuted(true));
  await page.waitForFunction(() => {
    const probe = window.mediaProbe;
    probe.analyser.getFloatTimeDomainData(probe.samples);
    return probe.samples.every((sample) => Math.abs(sample) < 0.00001);
  });
  await page.evaluate(() => {
    const sound = window.mediaProbe.sound;
    sound.setPlaying(false);
    sound.setMuted(false);
    for (const theme of [0, 1, 2]) {
      sound.setTheme(theme);
      sound.setPlaying(true);
      sound.setPlaying(false);
    }
    for (const effect of [
      'move',
      'rotate',
      'drop',
      'lock',
      'hold',
      'clear',
      'level',
      'resonance',
      'gameover',
    ])
      sound.effect(effect, 3);
  });
  await page.waitForFunction(() => {
    const probe = window.mediaProbe;
    probe.analyser.getFloatTimeDomainData(probe.samples);
    return probe.samples.some((sample) => Math.abs(sample) > 0.001);
  });
  await page.evaluate(() => {
    window.mediaProbe.sound.dispose();
    window.mediaProbe.analyser.disconnect();
  });
  const effects = await checkParticles(page);
  const clearEscalation = await checkClearEscalation(page);
  const clubPump = await checkClubPump(page);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        musicPeak,
        arrangements,
        mutedSilence: true,
        effectsProducedAudio: true,
        effects,
        clearEscalation,
        clubPump,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
