import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { checkNativeControls } from './mobile-input-checks.mjs';

const base = process.env.POLYPHASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.POLYPHASE_BROWSER,
});
const results = [];
const errors = [];
await mkdir('artifacts', { recursive: true });

async function geometry(page, width, height, state) {
  const layout = await page.evaluate(() => {
    const bounds = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
    return {
      viewport: [innerWidth, innerHeight],
      document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      scroll: [scrollX, scrollY],
      board: bounds('#board'),
      music: bounds('.site-footer'),
      deck: bounds('.touch-controls'),
      controls: [
        ...document.querySelectorAll(
          '[data-action], #resonance, #pause, .header-actions button, [data-theme], .mobile-setup select, [data-fusion-size], [data-overlay-action]',
        ),
      ]
        .filter((element) => element.checkVisibility())
        .map((element) => ({
          name:
            element.dataset.action ||
            element.id ||
            element.getAttribute('aria-label') ||
            element.textContent,
          ...element.getBoundingClientRect().toJSON(),
          reachable: (() => {
            const bounds = element.getBoundingClientRect();
            return element.contains(
              document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
            );
          })(),
        })),
    };
  });
  assert.deepEqual(layout.viewport, [width, height], `${state}: viewport must not zoom out`);
  assert.ok(
    layout.document[0] <= width && layout.document[1] <= height,
    `${state}: document overflow ${layout.document}`,
  );
  assert.deepEqual(layout.scroll, [0, 0]);
  assert.ok(layout.board.width > 44 && layout.board.height > 100);
  assert.ok(layout.board.top >= layout.music.bottom && layout.board.bottom <= height);
  if (layout.deck.height && height > 600) assert.ok(layout.board.bottom <= layout.deck.top);
  for (const control of layout.controls) {
    assert.ok(control.reachable, `${width}x${height} ${state}: ${control.name} is obscured`);
    assert.ok(
      control.width >= 44 && control.height >= 44,
      `${width}x${height} ${state}: ${control.name} target too small (${control.width}x${control.height})`,
    );
    assert.ok(
      control.left >= 0 && control.right <= width && control.top >= 0 && control.bottom <= height,
      `${width}x${height} ${state}: ${control.name} off screen`,
    );
  }
  return layout;
}

try {
  for (const [width, height, mode] of [
    [280, 653, 'pentris'],
    [320, 568, 'pentris'],
    [320, 480, 'pentris'],
    [320, 568, 'monotris'],
    [390, 844, 'pentris'],
    [768, 896, 'pentris'],
    [896, 768, 'fusion'],
    [844, 390, 'sextris'],
    [844, 390, 'fusion'],
    [568, 320, 'pentris'],
    [1024, 768, 'fusion'],
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
    await page.getByRole('button', { name: 'Enter the flow' }).waitFor();
    assert.equal(await page.locator('.touch-controls').isVisible(), false);
    if (mode !== 'pentris') await page.locator('#mobile-mode').selectOption(mode);
    await geometry(page, width, height, 'setup');
    await page.screenshot({ path: `artifacts/mobile-setup-${width}-${height}-${mode}.png` });
    await page.getByRole('button', { name: 'Settings', exact: true }).tap();
    await page.getByLabel('Spoken clear callouts', { exact: true }).uncheck();
    await page.getByLabel('Reduced motion', { exact: true }).check();
    await page.getByRole('button', { name: 'Close settings' }).tap();
    await page.getByRole('button', { name: 'Enter the flow' }).tap();
    await page.waitForFunction(() => document.body.classList.contains('in-run'));
    const layout = await geometry(page, width, height, 'playing');
    for (const [theme, label] of [
      ['Afterglow', 'AFTERGLOW'],
      ['Deep Blue', 'DEEP BLUE'],
      ['Eventide', 'EVENTIDE'],
    ]) {
      const button = page.getByRole('button', { name: `${theme} atmosphere`, exact: true });
      await button.tap();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#theme-name').textContent(), label);
      assert.equal(await page.locator('#overlay').isVisible(), false);
    }
    const anchored = await page.evaluate(() => {
      document.querySelector('#app').style.transform = 'translate3d(8px, 11px, 0)';
      const positions = ['.site-footer', '.touch-controls'].map((selector) =>
        document.querySelector(selector).getBoundingClientRect().toJSON(),
      );
      document.querySelector('#app').style.transform = '';
      return positions;
    });
    assert.equal(anchored[0].top, layout.music.top);
    assert.equal(anchored[1].top, layout.deck.top);
    for (const action of ['left', 'counter', 'rotate', 'right', 'hold'])
      await page.locator(`[data-action="${action}"]`).tap();
    await page.waitForFunction(() => document.querySelector('[data-action="hold"]').disabled);
    const usedHold = await page
      .locator('[data-action="hold"]')
      .evaluate((button) => getComputedStyle(button).opacity);
    assert.ok(Number(usedHold) < 0.5);
    await page.locator('[data-action="down"]').tap();
    await page.locator('[data-action="drop"]').tap();
    await page.waitForFunction(() => !document.querySelector('[data-action="hold"]').disabled);
    await page.waitForFunction(() => Number(document.querySelector('#score').textContent) > 0);
    if (mode === 'monotris') {
      // Build two short columns through real controls to charge the actual app.
      await page.locator('#board').tap();
      for (let placement = 0; placement < 26; placement++) {
        if (await page.locator('#resonance').isEnabled()) break;
        await page.keyboard.press(placement % 2 ? 'ArrowLeft' : 'ArrowRight');
        await page.locator('[data-action="drop"]').tap();
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      }
      await page.getByRole('button', { name: 'Activate Resonance', exact: true }).waitFor();
      assert.equal(await page.locator('#resonance').isEnabled(), true);
      await page.screenshot({ path: 'artifacts/mobile-resonance-game.png' });
      await page.locator('#resonance').tap();
      await page.waitForFunction(
        () => document.querySelector('#charge-percent').textContent === '0%',
      );
      assert.equal(await page.locator('#resonance').isDisabled(), true);
    }
    await page.screenshot({ path: `artifacts/mobile-play-${width}-${height}-${mode}.png` });
    await page.getByRole('button', { name: 'Pause game', exact: true }).tap();
    await page.getByRole('button', { name: 'Keep flowing' }).waitFor();
    assert.equal(await page.locator('#pause-label').innerText(), 'Resume');
    assert.equal(await page.locator('[data-action]:enabled').count(), 0);
    await geometry(page, width, height, 'paused');
    await page.getByRole('button', { name: 'Keep flowing' }).tap();
    await page.getByRole('button', { name: 'Leaderboard', exact: true }).tap();
    await page.getByLabel('Player name', { exact: true }).fill('PHONE PLAYER');
    const dialog = await page.locator('#leaderboard-dialog').boundingBox();
    assert.ok(
      dialog.x >= 0 &&
        dialog.x + dialog.width <= width &&
        dialog.y >= 0 &&
        dialog.y + dialog.height <= height,
    );
    assert.equal(await page.locator('[data-action]:enabled').count(), 0);
    await page.screenshot({ path: `artifacts/mobile-leaderboard-${width}-${height}.png` });
    await page.getByRole('button', { name: 'Close leaderboard', exact: true }).tap();
    await page.getByRole('button', { name: 'Keep flowing' }).tap();
    for (let index = 0; index < 55; index++) {
      if (await page.getByRole('button', { name: 'One more journey' }).isVisible()) break;
      await page.locator('[data-action="drop"]').tap();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    }
    await page.getByRole('button', { name: 'One more journey' }).waitFor();
    await geometry(page, width, height, 'game over');
    await page.screenshot({ path: `artifacts/mobile-over-${width}-${height}-${mode}.png` });
    await page.getByRole('button', { name: 'Back to frequencies' }).tap();
    await page.locator('#mobile-mode').selectOption('fusion');
    await geometry(page, width, height, 'Fusion setup');
    assert.equal(await page.locator('.touch-controls').isVisible(), false);
    if (width === 768) {
      await page.getByRole('button', { name: 'Enter the flow' }).tap();
      await page.waitForFunction(() => document.body.classList.contains('in-run'));
      await page.setViewportSize({ width: 896, height: 768 });
      await geometry(page, 896, 768, 'unfold resize');
    }
    results.push({ width, height, mode, layout });
    await context.close();
  }
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const nativeInput = await checkNativeControls(touch, base, errors);
  await touch.close();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(base);
  for (const width of [1440, 390]) {
    await desktop.setViewportSize({ width, height: 1000 });
    assert.equal(await desktop.locator('.touch-controls').isVisible(), false);
    assert.equal(await desktop.locator('.mobile-setup').isVisible(), false);
  }
  await desktop.close();
  assert.deepEqual(errors, []);
  await writeFile(
    'artifacts/mobile-smoke.json',
    JSON.stringify({ results, nativeInput, browserErrors: errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      viewports: results.map(({ width, height }) => [width, height]),
      nativeInput,
      browserErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
