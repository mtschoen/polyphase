// Exercise the built site without dev-server source imports, locally or on Pages.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.POLYPHASE_URL || 'http://127.0.0.1:4173/polyphase/';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.POLYPHASE_BROWSER,
});
const errors = [];
const results = [];
await mkdir('artifacts', { recursive: true });
try {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1440;
    const height = mobile ? 844 : 1000;
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) =>
      errors.push(`${request.url()}: ${request.failure()?.errorText}`),
    );
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
    });
    await page.goto(base);
    await page.getByRole('button', { name: 'Enter the flow' }).waitFor();
    assert.equal(await page.locator('#universe').getAttribute('data-universe-status'), 'ready');
    const favicon = await page.locator('link[rel="icon"]').evaluate((element) => element.href);
    assert.equal((await context.request.get(favicon)).status(), 200);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Spoken clear callouts', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Close settings' }).click();
    const effects = page.locator(mobile ? '#mobile-effects-mode' : '#effects-mode');
    await effects.click();
    assert.equal(await effects.textContent(), 'CALM FX');
    await page.reload();
    await page.getByRole('button', { name: 'Enter the flow' }).waitFor();
    assert.equal(await effects.textContent(), 'CALM FX', 'effects preference persists');
    assert.equal(await page.locator('#reduced-motion').isChecked(), true);
    await effects.click();
    assert.equal(await effects.textContent(), 'FULL FX');
    assert.equal(await page.locator('#reduced-motion').isChecked(), false);
    await page.getByRole('button', { name: 'How to play', exact: true }).click();
    assert.equal(await page.locator('#help-dialog .source-link').isVisible(), true);
    await page.getByRole('button', { name: 'Close help', exact: true }).click();
    await page.getByRole('button', { name: 'Enter the flow' }).click();
    await page.waitForFunction(() => document.querySelector('#overlay').hidden);
    await page.getByRole('button', { name: 'Afterglow atmosphere' }).click();
    assert.match(await page.locator('#track-name').textContent(), /Afterglow/);
    assert.equal(await page.locator('#overlay').isVisible(), false);
    if (mobile) {
      await page.getByRole('button', { name: 'Move right', exact: true }).tap();
      await page.getByRole('button', { name: 'Rotate clockwise', exact: true }).tap();
      await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
      assert.equal(await page.locator('#pause-label').innerText(), 'Pause');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390));
    } else {
      await page.locator('#board').click();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('KeyX');
      for (const key of ['ArrowUp', 'KeyW', 'Space']) {
        const previousScore = Number(await page.locator('#score').textContent());
        await page.keyboard.press(key);
        await page.waitForFunction(
          (previous) => Number(document.querySelector('#score').textContent) > previous,
          previousScore,
        );
      }
    }
    await page.waitForFunction(() => Number(document.querySelector('#score').textContent) > 0);
    await page.screenshot({
      path: `artifacts/release-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    await page.getByRole('button', { name: 'Keep flowing' }).waitFor();
    await page.getByRole('button', { name: 'Keep flowing' }).click();
    await page.locator('#board').click();
    for (let index = 0; index < 55; index++) {
      if (await page.getByRole('button', { name: 'One more journey' }).isVisible()) break;
      if (mobile) await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
      else await page.keyboard.press('Space');
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    }
    await page.getByRole('button', { name: 'View leaderboard', exact: true }).click();
    assert.equal(await page.locator('#leaderboard-entries tr').count(), 1);
    await page.getByRole('button', { name: 'Close leaderboard', exact: true }).click();
    await page.getByRole('button', { name: 'Back to frequencies' }).click();
    if (!mobile) {
      for (const key of [
        'ArrowUp',
        'ArrowUp',
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
      ])
        await page.keyboard.press(key);
      assert.equal(await page.locator('#juice-lab').isVisible(), true);
    }
    await page.reload();
    await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
    assert.equal(await page.locator('#leaderboard-entries tr').count(), 1);
    results.push({
      mobile,
      width,
      height,
      assets: true,
      gameplay: true,
      atmosphere: true,
      leaderboard: true,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  const report = { base, results, browserErrors: errors };
  await writeFile('artifacts/release-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
