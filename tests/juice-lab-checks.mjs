import assert from 'node:assert/strict';

const sequence = [
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
];

export async function unlockJuiceLab(page) {
  await page.evaluate(() => document.activeElement?.blur());
  for (const key of sequence) await page.keyboard.press(key);
  await page.locator('#juice-lab').waitFor({ state: 'visible' });
}

export async function checkJuiceLab(page) {
  const panel = page.locator('#juice-lab');
  assert.equal(await panel.isVisible(), false);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('x');
  for (const key of sequence.slice(1)) await page.keyboard.press(key);
  assert.equal(await panel.isVisible(), false, 'Wrong sequences must stay hidden');
  await unlockJuiceLab(page);
  for (const key of ['particleDensity', 'particleSize', 'screenShake']) {
    assert.equal(await page.locator(`#lab-${key}`).inputValue(), '100');
    assert.equal(await page.locator(`#lab-${key}`).getAttribute('max'), '300');
  }
  await page.locator('#lab-particleDensity').fill('250');
  await page.locator('#lab-screenShake').fill('0');
  const score = await page.locator('#score').textContent();
  for (let repeat = 0; repeat < 3; repeat++) {
    await panel.getByRole('button', { name: 'Try landing', exact: true }).click();
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.board-effects');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 40) visible++;
      return visible > 500;
    });
    assert.equal(await panel.isVisible(), true);
    assert.equal(await page.locator('#score').textContent(), score);
  }
  assert.equal(await page.locator('#app').evaluate((element) => element.style.transform), '');
  assert.equal(
    await page.locator('#board-frame').evaluate((element) => element.style.transform),
    '',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  assert.equal(await page.locator('#impact-particleDensity').inputValue(), '250');
  await page.locator('#impact-particleSize').fill('50');
  await page.getByLabel('Reduced motion', { exact: true }).check();
  assert.equal(await page.locator('#lab-particleDensity').isDisabled(), true);
  await page.getByLabel('Reduced motion', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close settings' }).click();
  assert.equal(await page.locator('#lab-particleSize').inputValue(), '50');
  await panel.getByRole('button', { name: 'Reset juice', exact: true }).click();
  await page.screenshot({ path: 'artifacts/polyphase-juice-lab.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await panel.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight;
    }),
  );
  await page.screenshot({ path: 'artifacts/polyphase-juice-lab-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#preview-clear').focus();
  await page.keyboard.press('Escape');
  assert.equal(await panel.isVisible(), false);
  await page.getByRole('button', { name: 'Enter the flow' }).click();
  await unlockJuiceLab(page);
  await page.getByRole('button', { name: 'Keep flowing' }).waitFor();
  const pausedScore = await page.locator('#score').textContent();
  await page.locator('#preview-clear').focus();
  await page.keyboard.press('ArrowDown');
  await panel.getByRole('button', { name: 'Try landing', exact: true }).focus();
  await page.keyboard.press('Space');
  assert.equal(await panel.isVisible(), true);
  assert.equal(await page.locator('#score').textContent(), pausedScore);
  await panel.getByRole('button', { name: 'Close juice lab', exact: true }).click();
  assert.ok(await page.getByRole('button', { name: 'Keep flowing' }).isVisible());
  await page.getByRole('button', { name: 'Back to frequencies' }).click();
  await page.reload();
  assert.equal(await panel.isVisible(), false, 'The lab stays hidden after reload');
  await unlockJuiceLab(page);
}
