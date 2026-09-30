import assert from 'node:assert/strict';

export async function checkImpactOptions(page) {
  const controls = [
    ['Particle density', 'particleDensity', '100'],
    ['Particle size', 'particleSize', '100'],
    ['Screen shake', 'screenShake', '100'],
  ];
  const settingsButton = page.getByRole('button', { name: 'Settings', exact: true });
  await settingsButton.click();
  for (const [label, key, value] of controls) {
    assert.equal(await page.getByRole('slider', { name: label, exact: true }).inputValue(), value);
    assert.equal(await page.locator(`#impact-${key}-value`).textContent(), `${value}%`);
    assert.equal(await page.locator(`#impact-${key}`).getAttribute('min'), '0');
    assert.equal(await page.locator(`#impact-${key}`).getAttribute('max'), '300');
  }
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('polyphase.settings'));
    Object.assign(settings, { particleDensity: 0.6, particleSize: 0.6, screenShake: 1.75 });
    localStorage.setItem('polyphase.settings', JSON.stringify(settings));
  });
  await page.reload();
  await settingsButton.click();
  for (const [label] of controls)
    assert.equal(await page.getByRole('slider', { name: label, exact: true }).inputValue(), '100');
  await page.getByRole('slider', { name: 'Particle density', exact: true }).focus();
  await page.keyboard.press('End');
  assert.equal(await page.locator('#impact-particleDensity').inputValue(), '300');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#impact-particleDensity').inputValue(), '0');
  await page.getByRole('slider', { name: 'Particle density', exact: true }).fill('300');
  await page.getByRole('slider', { name: 'Particle size', exact: true }).fill('175');
  await page.getByRole('slider', { name: 'Screen shake', exact: true }).fill('0');
  assert.equal(await page.locator('#impact-particleDensity-value').textContent(), '300%');
  assert.equal(await page.locator('#impact-particleSize-value').textContent(), '175%');
  assert.equal(await page.locator('#impact-screenShake-value').textContent(), '0%');
  await page.getByLabel('Reduced motion', { exact: true }).check();
  for (const [label] of controls)
    assert.equal(await page.getByRole('slider', { name: label, exact: true }).isDisabled(), true);
  await page.getByLabel('Reduced motion', { exact: true }).uncheck();
  assert.equal(await page.locator('#impact-particleDensity').inputValue(), '300');
  await page.reload();
  await settingsButton.click();
  assert.equal(await page.locator('#impact-particleDensity').inputValue(), '300');
  assert.equal(await page.locator('#impact-particleSize').inputValue(), '175');
  assert.equal(await page.locator('#impact-screenShake').inputValue(), '0');
  await page.screenshot({ path: 'artifacts/polyphase-juice-settings.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#impact-particleDensity').scrollIntoViewIfNeeded();
  assert.ok(
    await page.evaluate(() => {
      const dialog = document.querySelector('#settings-dialog');
      return (
        dialog.scrollWidth <= dialog.clientWidth &&
        document.documentElement.scrollWidth <= innerWidth
      );
    }),
  );
  await page.screenshot({ path: 'artifacts/polyphase-juice-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset juice', exact: true }).click();
  for (const [label, , value] of controls)
    assert.equal(await page.getByRole('slider', { name: label, exact: true }).inputValue(), value);
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
}
