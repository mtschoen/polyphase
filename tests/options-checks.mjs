import assert from 'node:assert/strict';

export async function checkModeOptions(page) {
  assert.equal(await page.locator('[data-mode]').count(), 7);
  await page.locator('[data-mode="tritris"]').click();
  assert.match(await page.locator('#board-size').textContent(), /10 × 22/);
  assert.match(await page.locator('#track-name').textContent(), /3\/4/);
  await page.locator('[data-mode="fusion"]').click();
  await page.getByLabel('3-square pieces', { exact: true }).check();
  await page.getByLabel('5-square pieces', { exact: true }).uncheck();
  await page.getByLabel('6-square pieces', { exact: true }).uncheck();
  assert.match(await page.locator('#board-size').textContent(), /10 × 22/);
  await page.getByLabel('3-square pieces', { exact: true }).click();
  assert.equal(await page.getByLabel('3-square pieces', { exact: true }).isChecked(), true);
  await page.getByLabel('5-square pieces', { exact: true }).check();
  await page.getByLabel('6-square pieces', { exact: true }).check();
  assert.match(await page.locator('#fusion-summary').textContent(), /3 \+ 5 \+ 6/);
  assert.match(await page.locator('#track-name').textContent(), /3\/4 \+ 5\/4 \+ 6\/8/);
  assert.match(await page.locator('#board-size').textContent(), /14 × 22/);
  await page.screenshot({ path: 'artifacts/polyphase-custom-fusion.png', fullPage: true });
  await page.getByRole('button', { name: 'Enter the flow' }).click();
  assert.equal(await page.getByLabel('3-square pieces', { exact: true }).isDisabled(), true);
  await page.keyboard.press('Space');
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Back to frequencies' }).click();
  assert.equal(await page.getByLabel('3-square pieces', { exact: true }).isEnabled(), true);
  await page.reload();
  await page.locator('[data-mode="fusion"]').click();
  for (const size of [1, 2, 3, 4, 5, 6])
    assert.equal(
      await page.getByLabel(`${size}-square pieces`, { exact: true }).isChecked(),
      [3, 5, 6].includes(size),
    );
  await page.locator('[data-mode="pentris"]').click();
}
