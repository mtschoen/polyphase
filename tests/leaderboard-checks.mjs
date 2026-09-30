import assert from 'node:assert/strict';

/** Exercise the real dialog and browser storage without touching gameplay state. */
export async function checkLeaderboard(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const frame = document.createElement('iframe');
        frame.name = 'leaderboard-check-frame';
        frame.id = 'leaderboard-check-frame';
        frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:100';
        frame.onload = resolve;
        frame.srcdoc = '<!doctype html><html><head></head><body></body></html>';
        document.body.append(frame);
      }),
  );
  const surface = page.frame({ name: 'leaderboard-check-frame' });
  await surface.evaluate(async () => {
    const { LeaderboardPanel } = await import(
      new URL('/src/leaderboard-panel.ts', document.baseURI).href
    );
    const { LEADERBOARD_STORAGE_KEY } = await import(
      new URL('/src/leaderboard.ts', document.baseURI).href
    );
    const previous = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/src/styles/leaderboard.css';
    document.head.append(style);
    let opens = 0;
    let errors = 0;
    const callbacks = {
      onOpen: () => {
        opens++;
      },
      onStorageError: () => {
        errors++;
      },
    };
    const panel = new LeaderboardPanel(callbacks);
    const probe = {
      panel,
      callbacks,
      key: LEADERBOARD_STORAGE_KEY,
      previous,
      style,
      get opens() {
        return opens;
      },
      get errors() {
        return errors;
      },
    };
    window.leaderboardProbe = probe;
    panel.open('fusion-3-5-6', 'flow');
  });
  try {
    const dialog = surface.locator('#leaderboard-dialog');
    await dialog.waitFor({ state: 'visible' });
    assert.equal(
      await dialog.getByText('On this device', { exact: true }).textContent(),
      'On this device',
    );
    assert.equal(
      await dialog.getByText('No completed runs yet. Your next game starts the list.').isVisible(),
      true,
    );
    await dialog.getByLabel('Player name').fill('<Ada>');
    await surface.evaluate(() => {
      const run = {
        id: 'native-first',
        recordKey: 'fusion-3-5-6',
        difficulty: 'flow',
        score: 1200,
        lines: 8,
        level: 1,
        duration: 65,
        completedAt: 1700000000000,
      };
      window.leaderboardProbe.panel.recordRun(run);
      window.leaderboardProbe.panel.recordRun(run);
      window.leaderboardProbe.panel.recordRun({
        ...run,
        id: 'native-rush',
        difficulty: 'rush',
        score: 2000,
      });
    });
    assert.equal(await dialog.locator('tbody tr').count(), 1);
    assert.match(await dialog.locator('tbody').textContent(), /<Ada>/);
    assert.equal(await dialog.locator('tbody ada').count(), 0, 'Names must be displayed as text');
    await dialog.getByLabel('Pace').selectOption('rush');
    assert.equal(await dialog.locator('tbody tr').count(), 1);
    assert.match(await dialog.locator('tbody').textContent(), /2,000/);
    await dialog.getByLabel('Shapes').selectOption('pentris');
    assert.equal(await dialog.locator('tbody tr').count(), 0);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await surface.evaluate(async () => {
      const { LeaderboardPanel } = await import(
        new URL('/src/leaderboard-panel.ts', document.baseURI).href
      );
      const probe = window.leaderboardProbe;
      probe.panel.dispose();
      probe.panel = new LeaderboardPanel(probe.callbacks);
      probe.panel.open('fusion-3-5-6', 'flow');
    });
    assert.equal(await dialog.getByLabel('Player name').inputValue(), '<Ada>');
    assert.equal(await dialog.locator('tbody tr').count(), 1);
    // LAN HTTP may lack randomUUID. The optional-id public API must still record runs.
    await surface.evaluate(() => {
      const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
      Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
      try {
        for (let index = 0; index < 2; index++)
          window.leaderboardProbe.panel.recordRun({
            recordKey: 'pentris',
            difficulty: 'flow',
            score: index,
            lines: 0,
            level: 1,
            duration: 0,
          });
      } finally {
        if (descriptor) Object.defineProperty(crypto, 'randomUUID', descriptor);
        else delete crypto.randomUUID;
      }
    });
    await dialog.getByLabel('Shapes').selectOption('pentris');
    assert.equal(await dialog.locator('tbody tr').count(), 2);
    const stored = await surface.evaluate(() =>
      JSON.parse(localStorage.getItem(window.leaderboardProbe.key)),
    );
    assert.equal(stored.entries.length, 4);
    assert.equal(new Set(stored.entries.map(({ id }) => id)).size, 4);
    await dialog.getByRole('button', { name: 'Close leaderboard' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await surface.evaluate(async () => {
      const { LeaderboardPanel } = await import(
        new URL('/src/leaderboard-panel.ts', document.baseURI).href
      );
      const probe = window.leaderboardProbe;
      probe.panel.dispose();
      probe.panel = new LeaderboardPanel(probe.callbacks, {
        getItem() {
          throw new Error('Storage blocked');
        },
        setItem() {
          throw new Error('Storage blocked');
        },
      });
      probe.panel.recordRun({
        id: 'memory-run',
        recordKey: 'pentris',
        difficulty: 'flow',
        score: 123,
        lines: 0,
        level: 1,
        duration: 0,
      });
      probe.panel.open('pentris', 'flow');
    });
    assert.equal(await dialog.locator('tbody tr').count(), 1);
    assert.equal(await dialog.locator('.leaderboard-error').isVisible(), true);
    const result = await surface.evaluate(() => ({
      opens: window.leaderboardProbe.opens,
      errors: window.leaderboardProbe.errors,
    }));
    assert.equal(result.errors, 1);
    return { ...result, storedEntries: stored.entries.length };
  } finally {
    await surface.evaluate(() => {
      const probe = window.leaderboardProbe;
      probe.panel.dispose();
      probe.style.remove();
      if (probe.previous === null) localStorage.removeItem(probe.key);
      else localStorage.setItem(probe.key, probe.previous);
      delete window.leaderboardProbe;
    });
    await page.evaluate(() => document.querySelector('#leaderboard-check-frame').remove());
  }
}
