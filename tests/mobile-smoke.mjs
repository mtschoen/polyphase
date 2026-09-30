import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.POLYPHASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.POLYPHASE_BROWSER,
});
const results = [];
const errors = [];
await mkdir('artifacts', { recursive: true });
try {
  for (const [width, height, mode] of [
    [320, 568, 'monotris'],
    [390, 844, 'pentris'],
    [844, 390, 'sextris'],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      screen: { width, height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator(`[data-mode="${mode}"]`).tap();
    await page.getByRole('button', { name: 'Enter the flow' }).tap();
    await page.waitForFunction(() => document.body.classList.contains('in-run'));
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      scroll: scrollY,
      board: document.querySelector('#board').getBoundingClientRect().toJSON(),
      dock: document.querySelector('.site-footer').getBoundingClientRect().toJSON(),
      controls: [
        ...document.querySelectorAll(
          '[data-action], #resonance, #pause, .header-actions button, [data-theme]',
        ),
      ]
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => ({
          action: element.dataset.action || element.id || `theme-${element.dataset.theme}`,
          ...element.getBoundingClientRect().toJSON(),
        })),
    }));
    assert.equal(geometry.width, width, 'The phone must not zoom out to fit overflowing content');
    assert.ok(geometry.documentWidth <= width);
    assert.equal(geometry.scroll, 0);
    assert.ok(geometry.board.top >= 0 && geometry.board.bottom <= height);
    assert.ok(geometry.dock.height >= 56 && geometry.dock.bottom <= height);
    assert.ok(geometry.board.bottom <= geometry.dock.top);
    for (const control of geometry.controls) {
      assert.ok(
        control.width >= 44 && control.height >= 44,
        `${mode} ${control.action} target is too small`,
      );
      assert.ok(
        control.left >= 0 && control.right <= width && control.top >= 0 && control.bottom <= height,
        `${mode} ${control.action} must fit the visible phone screen`,
      );
      if (!control.action.startsWith('theme-'))
        assert.ok(control.bottom <= geometry.dock.top, `${control.action} overlaps the music dock`);
    }
    assert.equal(await page.locator('#pause-label').innerText(), 'Pause');
    for (const [theme, label] of [
      ['Afterglow', 'AFTERGLOW'],
      ['Deep Blue', 'DEEP BLUE'],
      ['Eventide', 'EVENTIDE'],
    ]) {
      const button = page.getByRole('button', { name: `${theme} atmosphere`, exact: true });
      await button.tap();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#theme-name').textContent(), label);
      assert.match(await page.locator('#track-name').textContent(), new RegExp(theme));
      assert.equal(
        await page.locator('#overlay').isVisible(),
        false,
        'Changing mood keeps the game running',
      );
    }
    const dockDuringShake = await page.evaluate(() => {
      document.querySelector('#app').style.transform = 'translate3d(8px, 11px, 0)';
      const bounds = document.querySelector('.site-footer').getBoundingClientRect().toJSON();
      document.querySelector('#app').style.transform = '';
      return bounds;
    });
    assert.equal(
      dockDuringShake.top,
      geometry.dock.top,
      'The music dock stays anchored during screen shake',
    );
    for (const action of ['left', 'rotate', 'right', 'hold', 'down', 'drop'])
      await page.locator(`[data-action="${action}"]`).tap();
    await page.waitForFunction(() => Number(document.querySelector('#score').textContent) > 0);
    assert.match(await page.locator('#hold-caption').textContent(), /swap/);
    await page.screenshot({ path: `artifacts/mobile-play-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Pause game', exact: true }).tap();
    await page.getByRole('button', { name: 'Keep flowing' }).waitFor();
    assert.equal(await page.locator('#pause-label').innerText(), 'Resume');
    await page.getByRole('button', { name: 'Keep flowing' }).tap();
    await page.getByRole('button', { name: 'Leaderboard', exact: true }).tap();
    await page.getByLabel('Player name', { exact: true }).fill('PHONE PLAYER');
    const leaderboardBounds = await page.locator('#leaderboard-dialog').boundingBox();
    assert.ok(leaderboardBounds.x >= 0 && leaderboardBounds.x + leaderboardBounds.width <= width);
    await page.screenshot({ path: `artifacts/mobile-leaderboard-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Close leaderboard', exact: true }).tap();
    await page.getByRole('button', { name: 'Keep flowing' }).waitFor();
    await page.getByRole('button', { name: 'Keep flowing' }).tap();
    results.push({ mode, width, height, geometry, touchActions: true });
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  // Serve the fixture normally so LAN tests retain the real connection's address space.
  await page.goto(`${base}/tests/fixtures/touch-probe.html`);
  await page.evaluate(async () => {
    const { InputController } = await import('/src/input.ts');
    for (const action of ['left', 'right', 'rotate', 'down', 'hold', 'drop']) {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.textContent = action;
      button.style.cssText = 'width:100px;height:70px;touch-action:none';
      document.querySelector('#controls').append(button);
    }
    const state = { x: 0, softDrop: false, rotations: 0, holds: 0, drops: 0 };
    const input = new InputController({
      move: (direction) => (state.x += direction),
      softDrop: (value) => (state.softDrop = value),
      rotate: () => state.rotations++,
      hold: () => state.holds++,
      drop: () => state.drops++,
      resonate: () => {},
      pause: () => {},
      mute: () => {},
      fullscreen: () => {},
      start: () => {},
      isPlaying: () => true,
      isReady: () => false,
    });
    window.touchProbe = { input, state };
  });
  const session = await context.newCDPSession(page);
  const point = async (action, id) => {
    const bounds = await page.locator(`[data-action="${action}"]`).boundingBox();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, id };
  };
  const left = await point('left', 1);
  const down = await point('down', 2);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, down] });
  assert.equal(await page.evaluate(() => window.touchProbe.state.softDrop), true);
  const beforeRepeat = await page.evaluate(() => window.touchProbe.state.x);
  await page.evaluate(() => window.touchProbe.input.update(0.2));
  assert.ok((await page.evaluate(() => window.touchProbe.state.x)) < beforeRepeat);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await page.evaluate(() => window.touchProbe.state.softDrop), false);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, down] });
  assert.equal(await page.evaluate(() => window.touchProbe.state.softDrop), true);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await page.evaluate(() => window.touchProbe.state.softDrop), false);
  const released = await page.evaluate(() => window.touchProbe.state.x);
  await page.evaluate(() => window.touchProbe.input.update(1));
  assert.equal(await page.evaluate(() => window.touchProbe.state.x), released);
  for (const action of ['rotate', 'hold', 'drop'])
    await page.locator(`[data-action="${action}"]`).tap();
  const state = await page.evaluate(() => {
    window.touchProbe.input.dispose();
    return window.touchProbe.state;
  });
  assert.equal(state.rotations, 1);
  assert.equal(state.holds, 1);
  assert.equal(state.drops, 1);
  assert.deepEqual(errors, []);
  await writeFile(
    'artifacts/mobile-smoke.json',
    JSON.stringify({ results, multiTouch: state, browserErrors: errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      viewports: results.map(({ width, height }) => [width, height]),
      nativeMultiTouch: true,
      browserErrors: errors,
    }),
  );
  await context.close();
} finally {
  await browser.close();
}
