import assert from 'node:assert/strict';

export async function checkParticles(page) {
  const results = await page.evaluate(async () => {
    const { GameEngine } = await import('/src/game/engine.ts');
    const { BoardRenderer } = await import('/src/renderer.ts');
    const { pentominoes } = await import('/src/game/shapes.ts');
    const frame = document.createElement('div');
    frame.style.cssText =
      'position:fixed;left:420px;top:50px;width:360px;z-index:1;background:#06100d';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:360px;height:660px';
    frame.append(canvas);
    document.body.append(frame);
    const renderer = new BoardRenderer(canvas, frame);
    const game = new GameEngine('pentris', 'flow', () => 0.5);
    game.start();
    game.drainEvents();
    const straight = pentominoes.find((piece) => piece.cells.every((cell) => cell[1] === 0));
    game.active = { ...straight, x: 4, y: 0 };
    game.hardDrop();
    const events = game.drainEvents();
    events.forEach((event) => renderer.handle(event, game.width));
    // Advance past the shockwave and drop trail so only actual particles remain.
    for (let step = 0; step < 57; step++) renderer.render(game, 1 / 60, step / 60);
    const effects = [...document.querySelectorAll('.board-effects')].at(-1);
    if (!effects) {
      renderer.dispose();
      frame.remove();
      return { separateEffectsLayer: false };
    }
    const countPixels = (outside = false) => {
      const pixels = effects
        .getContext('2d')
        .getImageData(0, 0, effects.width, effects.height).data;
      const bounds = effects.getBoundingClientRect();
      const board = canvas.getBoundingClientRect();
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const x = bounds.left + (((index / 4) % effects.width) * bounds.width) / effects.width;
        const y =
          bounds.top + (Math.floor(index / 4 / effects.width) * bounds.height) / effects.height;
        const isOutside = x < board.left || x > board.right || y < board.top || y > board.bottom;
        if (pixels[index + 3] > 40 && (!outside || isOutside)) count++;
      }
      return count;
    };
    const dropPixels = countPixels();
    const escapedPixels = countPixels(true);
    const style = getComputedStyle(effects);
    const pointerTransparent = style.pointerEvents === 'none';
    const layerVisible =
      style.display !== 'none' &&
      style.visibility === 'visible' &&
      Number(style.opacity) > 0 &&
      Number(style.zIndex) > Number(getComputedStyle(frame).zIndex);
    for (let step = 0; step < 120; step++) renderer.render(game, 1 / 60, step / 60);
    const expiredPixels = countPixels();
    renderer.reset();
    events
      .filter((event) => event.type === 'lock')
      .forEach((event) => renderer.handle(event, game.width));
    renderer.render(game, 0.2, 3);
    const lockPixels = countPixels();
    renderer.reset();
    game.active = { ...straight, x: 7, y: 0 };
    game.board[21] = Array.from({ length: 12 }, (_, column) => (column < 7 ? 1 : null));
    game.hardDrop();
    game
      .drainEvents()
      .filter((event) => event.type === 'clear')
      .forEach((event) => renderer.handle(event, game.width));
    renderer.render(game, 0.1, 4);
    const clearPixels = countPixels();
    const lineCleared = game.lines === 1;
    const shakeVisible = frame.style.transform.includes('translate3d');
    renderer.reset();
    game.board[21][0] = 1;
    game.charge = 100;
    const resonated = game.activateResonance();
    game
      .drainEvents()
      .filter((event) => event.type === 'resonance')
      .forEach((event) => renderer.handle(event, game.width));
    renderer.render(game, 0.1, 5);
    const resonancePixels = countPixels();
    renderer.reducedMotion = true;
    renderer.render(game, 1 / 60, 6);
    const reducedMotionClearsEffects = countPixels() === 0 && frame.style.transform === '';
    renderer.reducedMotion = false;
    events.forEach((event) => renderer.handle(event, game.width));
    renderer.render(game, 0.2, 7);
    renderer.reset();
    const resetClearsEffects = countPixels() === 0;
    renderer.dispose();
    const disposedLayer = !effects.isConnected;
    frame.remove();
    return {
      separateEffectsLayer: true,
      dropPixels,
      escapedPixels,
      lockPixels,
      clearPixels,
      resonancePixels,
      expiredPixels,
      pointerTransparent,
      layerVisible,
      lineCleared,
      shakeVisible,
      resonated,
      reducedMotionClearsEffects,
      resetClearsEffects,
      disposedLayer,
    };
  });
  assert.equal(results.separateEffectsLayer, true, 'Impacts need an unclipped effects layer');
  for (const key of ['dropPixels', 'lockPixels', 'clearPixels', 'resonancePixels'])
    assert.ok(results[key] > 100, `${key} must contain a substantial visible burst`);
  assert.ok(results.escapedPixels > 50, 'Bottom impacts must remain visible outside the board');
  assert.equal(results.expiredPixels, 0, 'Expired particles must leave no stale pixels');
  for (const key of [
    'pointerTransparent',
    'layerVisible',
    'lineCleared',
    'shakeVisible',
    'resonated',
    'reducedMotionClearsEffects',
    'resetClearsEffects',
    'disposedLayer',
  ])
    assert.equal(results[key], true, key);
  return results;
}
