import assert from 'node:assert/strict';

export async function checkNativeControls(context, base, errors) {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/tests/fixtures/touch-probe.html`);
  await page.evaluate(async () => {
    await import('/src/style.css');
    const { InputController } = await import('/src/input.ts');
    const { GameEngine } = await import('/src/game/engine.ts');
    const { createInterface, updateControls, renderOverlay } = await import('/src/interface.ts');
    document.body.innerHTML = '<div id="app"></div>';
    createInterface();
    const game = new GameEngine('pentris', 'flow', () => 0.37);
    game.start();
    document.body.classList.add('in-run');
    const sync = () => {
      updateControls(game);
      renderOverlay(game.status, game.score);
    };
    const input = new InputController({
      move: (direction) => game.move(direction),
      softDrop: (value) => {
        game.softDrop = value;
      },
      softDropOnce: () => game.softDropOnce(),
      rotate: (direction) => game.rotate(direction),
      drop: () => {
        game.hardDrop();
        sync();
      },
      hold: () => {
        game.hold();
        sync();
      },
      resonate: () => {
        game.activateResonance();
        sync();
      },
      pause: () => {
        game.setPaused(game.status === 'playing');
        sync();
      },
      mute: () => {},
      fullscreen: () => {},
      start: () => {
        game.start();
        sync();
      },
      isPlaying: () => game.status === 'playing',
      isReady: () => game.status === 'ready',
    });
    document.querySelector('#resonance').addEventListener('click', () => {
      game.activateResonance();
      sync();
    });
    window.touchProbe = { game, input, sync };
    sync();
  });
  const session = await context.newCDPSession(page);
  const point = async (action, id) => {
    const bounds = await page.locator(`[data-action="${action}"]`).boundingBox();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, id };
  };
  const send = (type, touchPoints) =>
    session.send('Input.dispatchTouchEvent', { type, touchPoints });
  const snapshot = () =>
    page.evaluate(() => {
      const { game } = window.touchProbe;
      return {
        x: game.active.x,
        y: game.active.y,
        cells: game.active.cells,
        softDrop: game.softDrop,
        charge: game.charge,
        held: game.held?.id,
        blocks: game.board.flat().filter((cell) => cell !== null).length,
      };
    });
  const left = await point('left', 1);
  const down = await point('down', 2);
  const counter = await point('counter', 3);
  const rotate = await point('rotate', 4);
  const drop = await point('drop', 5);
  const beforeKeyboardDrop = await snapshot();
  await page.locator('[data-action="down"]').focus();
  await page.keyboard.press('Space');
  assert.equal(
    (await snapshot()).y,
    beforeKeyboardDrop.y + 1,
    'Native button activation soft drops one row',
  );
  assert.equal((await snapshot()).softDrop, false);
  const original = await snapshot();
  await send('touchStart', [left]);
  assert.equal((await snapshot()).x, original.x - 1);
  await page.evaluate(() => window.touchProbe.input.update(0.28));
  assert.equal((await snapshot()).x, original.x - 1, 'A short touch must move only one cell');
  await send('touchMove', [{ ...down, id: left.id }]);
  assert.equal((await snapshot()).softDrop, false, 'Captured thumb drift must not select down');
  await send('touchStart', [{ ...down, id: left.id }, down]);
  assert.equal((await snapshot()).softDrop, false, 'Only one direction-pad contact can act');
  await send('touchStart', [{ ...down, id: left.id }, down, counter]);
  assert.notDeepEqual(
    (await snapshot()).cells,
    original.cells,
    'Second thumb rotates counterclockwise',
  );
  // On partial release Chromium ends the contacts named in touchPoints.
  await send('touchEnd', [counter]);
  await send('touchStart', [{ ...down, id: left.id }, down, rotate]);
  assert.deepEqual(
    (await snapshot()).cells,
    original.cells,
    'Clockwise reverses the counterclockwise turn',
  );
  await send('touchEnd', [{ ...down, id: left.id }, rotate]);
  const releasedX = (await snapshot()).x;
  await page.evaluate(() => window.touchProbe.input.update(1));
  assert.equal((await snapshot()).x, releasedX);
  assert.equal(
    (await snapshot()).softDrop,
    false,
    'A rejected contact cannot take over after release',
  );
  await send('touchEnd', []);

  const pad = await page.locator('.direction-pad').boundingBox();
  const center = { x: pad.x + pad.width / 2, y: pad.y + pad.height / 2, id: 6 };
  const beforeGap = await snapshot();
  await send('touchStart', [center]);
  await send('touchMove', [{ ...drop, id: center.id }]);
  await send('touchEnd', []);
  assert.deepEqual(
    await snapshot(),
    beforeGap,
    'The neutral center cannot become a drop by drifting',
  );

  await send('touchStart', [down]);
  assert.equal((await snapshot()).softDrop, true);
  await send('touchStart', [down, rotate]);
  assert.equal((await snapshot()).softDrop, true);
  await send('touchCancel', []);
  assert.equal((await snapshot()).softDrop, false);
  await send('touchStart', [left]);
  const beforeRepeat = (await snapshot()).x;
  await page.evaluate(() => window.touchProbe.input.update(0.4));
  assert.ok((await snapshot()).x < beforeRepeat);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const afterBlur = (await snapshot()).x;
  await page.evaluate(() => window.touchProbe.input.update(1));
  assert.equal((await snapshot()).x, afterBlur);
  await send('touchEnd', []);

  await send('touchStart', [drop]);
  const dropped = await snapshot();
  assert.ok(dropped.blocks > beforeGap.blocks);
  await send('touchMove', [{ ...left, id: drop.id }]);
  await page.evaluate(() => window.touchProbe.input.update(5));
  assert.deepEqual(await snapshot(), dropped, 'Held hard drop never commits the next piece');
  await send('touchEnd', []);
  await page.locator('[data-action="hold"]').tap();
  assert.equal(await page.locator('[data-action="hold"]').isDisabled(), true);
  const held = (await snapshot()).held;
  const hold = await point('hold', 7);
  await send('touchStart', [hold]);
  await send('touchEnd', []);
  assert.equal((await snapshot()).held, held);
  await page.locator('[data-action="drop"]').tap();
  assert.equal(await page.locator('[data-action="hold"]').isDisabled(), false);

  await page.evaluate(() => {
    const { game, sync } = window.touchProbe;
    game.board[game.height - 1][0] = 1;
    game.charge = 100;
    sync();
  });
  const resonance = page.getByRole('button', { name: 'Activate Resonance', exact: true });
  assert.equal(await resonance.isEnabled(), true);
  const appearance = await resonance.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      border: style.borderTopStyle,
      animation: style.animationName,
      shadow: style.boxShadow,
    };
  });
  assert.equal(appearance.border, 'solid');
  assert.notEqual(appearance.animation, 'none');
  assert.notEqual(appearance.shadow, 'none');
  await page.screenshot({ path: 'artifacts/mobile-resonance-charged.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await resonance.evaluate((button) => getComputedStyle(button).animationName),
    'none',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => document.body.classList.add('reduced-motion'));
  assert.equal(
    await resonance.evaluate((button) => getComputedStyle(button).animationName),
    'none',
  );
  await resonance.tap();
  assert.equal((await snapshot()).charge, 0);
  assert.equal(await page.locator('#resonance').isDisabled(), true);

  await page.evaluate(() => {
    const { game, sync } = window.touchProbe;
    game.setPaused(true);
    sync();
  });
  const paused = await snapshot();
  await send('touchStart', [drop]);
  await send('touchEnd', []);
  assert.deepEqual(await snapshot(), paused, 'Paused controls cannot affect game state');
  await page.evaluate(() => {
    const { game, input, sync } = window.touchProbe;
    game.setPaused(false);
    sync();
    input.dispose();
  });
  await page.locator('[data-action="drop"]').tap();
  assert.deepEqual(await snapshot(), paused, 'Disposal removes native input listeners');
  await page.close();
  return {
    capturedDrift: true,
    exclusivePad: true,
    bothRotations: true,
    deadCenter: true,
    cancelAndBlur: true,
    singleDrop: true,
    holdAvailability: true,
    resonanceAndReducedMotion: true,
  };
}
