import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { checkModeOptions } from './options-checks.mjs';
import { checkImpactOptions } from './impact-options-checks.mjs';
import { checkJuiceLab } from './juice-lab-checks.mjs';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.POLYPHASE_BROWSER,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.emulateMedia({ reducedMotion: 'reduce' });
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
  assert.equal(
    await page.locator('body').evaluate((body) => body.classList.contains('reduced-motion')),
    false,
    'Fresh settings use full effects even when the OS prefers reduced motion',
  );
  assert.equal(await page.locator('#effects-mode').textContent(), 'FULL FX');
  assert.equal(await page.locator('#universe').getAttribute('data-universe-status'), 'ready');
  // Keep OS speech quiet during automated previews; native voice behavior has its own tests.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Spoken clear callouts', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await checkImpactOptions(page);
  checks.push('Normalized impact sliders, keyboard control, saved mix and reduced motion');
  await checkJuiceLab(page);
  checks.push(
    'Hidden Konami lab, repeatable previews, synchronized sliders, keyboard isolation and mobile fit',
  );
  const clearNames = [
    'POP!',
    'DOUBLE TROUBLE!',
    'TRIPLE THREAT!',
    'QUAD QUAKE!',
    'PENTACLYSM!',
    'HEXAGEDDON!',
  ];
  for (const [index, name] of clearNames.entries()) {
    await page.locator('#preview-clear').selectOption(String(index + 1));
    await page.getByRole('button', { name: 'Try explosion', exact: true }).click();
    await page.waitForFunction(
      (label) => document.querySelector('#callout strong')?.textContent === label,
      name,
    );
    assert.equal(await page.locator('#score').textContent(), '000000');
    if (index === 5)
      await page.screenshot({ path: 'artifacts/polyphase-hexageddon.png', fullPage: true });
  }
  await page.getByRole('button', { name: 'Close juice lab', exact: true }).click();
  checks.push('Full effects default despite OS preference; all six named previews preserve score');
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
  await checkModeOptions(page);
  checks.push(
    'All size options, custom 3+5+6 mix, nonempty selection, record configuration and persistence',
  );
  for (const mode of ['monotris', 'ditris', 'tritris', 'tetris', 'pentris', 'sextris', 'fusion']) {
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
    if (mode === 'fusion')
      assert.ok(
        await page.evaluate(
          () => Number(localStorage.getItem('polyphase.best.fusion-3-5-6.flow')) > 0,
        ),
      );
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
