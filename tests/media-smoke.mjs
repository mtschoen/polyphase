import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

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
  const effects = await page.evaluate(async () => {
    const { GameEngine } = await import('/src/game/engine.ts');
    const { BoardRenderer } = await import('/src/renderer.ts');
    const { pentominoes } = await import('/src/game/shapes.ts');
    const game = new GameEngine();
    game.start();
    const straight = pentominoes.find((piece) => piece.cells.every((cell) => cell[1] === 0));
    game.active = { ...straight, x: 7, y: 0 };
    game.board[21] = Array.from({ length: 12 }, (_, column) => (column < 7 ? 1 : null));
    const frame = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:360px;height:660px';
    frame.append(canvas);
    document.body.append(frame);
    const renderer = new BoardRenderer(canvas, frame);
    game.hardDrop();
    const events = game.drainEvents();
    events.forEach((event) => renderer.handle(event, game.width));
    renderer.render(game, 1 / 60, 1);
    const lineCleared = game.lines === 1 && events.some((event) => event.type === 'clear');
    const particlesVisible = canvas
      .getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height)
      .data.some((channel, index) => index % 4 === 3 && channel > 0);
    const shakeVisible = frame.style.transform.includes('translate3d');
    game.board[21][0] = 1;
    game.charge = 100;
    const resonated = game.activateResonance();
    game.drainEvents().forEach((event) => renderer.handle(event, game.width));
    renderer.render(game, 1 / 60, 2);
    renderer.reducedMotion = true;
    renderer.render(game, 1 / 60, 3);
    const reducedMotionStopsShake = frame.style.transform === '';
    renderer.dispose();
    frame.remove();
    return { lineCleared, particlesVisible, shakeVisible, resonated, reducedMotionStopsShake };
  });
  assert.ok(Object.values(effects).every(Boolean));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        musicPeak,
        mutedSilence: true,
        allEffectsProducedAudio: true,
        effects,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
