import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.POLYPHASE_BROWSER,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await mkdir('artifacts', { recursive: true });
const checks = [];
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Enter the flow' }).waitFor();
  assert.equal(await page.locator('#universe').getAttribute('data-universe-status'), 'ready');
  await page.screenshot({ path: 'artifacts/polyphase-menu.png', fullPage: true });
  checks.push('Menu, GPU atmosphere, fonts and interface loaded');
  await page.getByRole('button', { name: 'Mute sound', exact: true }).focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
  assert.ok(await page.getByRole('button', { name: 'Enter the flow' }).isVisible());
  await page.getByRole('button', { name: 'Unmute sound', exact: true }).click();
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
  );
  assert.equal(await page.locator('#universe').getAttribute('data-universe-status'), 'ready');
  for (const mode of ['pentris', 'sextris', 'fusion']) {
    await page.locator(`[data-mode="${mode}"]`).click();
    await page.getByRole('button', { name: 'Enter the flow' }).click();
    await page.waitForFunction(() => document.querySelector('#overlay').hidden);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('c');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => Number(document.querySelector('#score').textContent) > 0);
    assert.match(await page.locator('#hold-caption').textContent(), /swap/);
    await page.screenshot({ path: `artifacts/polyphase-${mode}-playing.png`, fullPage: true });
    await page.keyboard.press('p');
    await page.getByRole('button', { name: 'Keep flowing' }).waitFor();
    await page.screenshot({ path: `artifacts/polyphase-${mode}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Keep flowing' }).click();
    for (let index = 0; index < 55; index++) {
      if (await page.getByRole('button', { name: 'One more journey' }).isVisible()) break;
      await page.keyboard.press('Space');
    }
    await page.getByRole('button', { name: 'One more journey' }).waitFor();
    const best = await page.locator('#best').textContent();
    assert.ok(Number(best.replaceAll(',', '')) > 0);
    await page.getByRole('button', { name: 'Back to frequencies' }).click();
    checks.push(`${mode}: move, rotate, hold, drop, pause/resume, top-out, personal best, menu`);
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByLabel('Landing guide', { exact: true }).uncheck();
  await page.getByLabel('Master volume').fill('35');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Afterglow atmosphere' }).click();
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Enter the flow' }).waitFor();
  assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#theme-name').textContent(), 'AFTERGLOW');
  assert.ok(
    await page.locator('body').evaluate((body) => body.classList.contains('reduced-motion')),
  );
  checks.push('Settings, theme, mute, and personal records persist across reload');
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await page.getByRole('button', { name: 'Close help' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/polyphase-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('button', { name: 'Enter the flow' }).click();
  await page.locator('[data-action="right"]').click();
  await page.locator('[data-action="drop"]').click();
  checks.push('Mobile viewport has no horizontal overflow and touch controls are reachable');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, browserErrors: errors }, null, 2));
  await writeFile(
    'artifacts/browser-smoke.json',
    JSON.stringify({ checks, browserErrors: errors }, null, 2),
  );
} finally {
  await browser.close();
}
