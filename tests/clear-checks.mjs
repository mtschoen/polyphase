import assert from 'node:assert/strict';

export async function checkClearEscalation(page) {
  const result = await page.evaluate(async () => {
    const { GameEngine } = await import('/src/game/engine.ts');
    const { polyominoesBySize, rotateCells } = await import('/src/game/shapes.ts');
    const { BoardRenderer } = await import('/src/renderer.ts');
    const { GameFeedback } = await import('/src/feedback.ts');
    const { getClearTier } = await import('/src/clear-tiers.ts');
    const frame = document.createElement('div');
    frame.style.cssText =
      'position:fixed;left:400px;top:50px;width:336px;background:#06100d;z-index:1';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:528px';
    frame.append(canvas);
    document.body.append(frame);
    const renderer = new BoardRenderer(canvas, frame);
    const effects = [...document.querySelectorAll('.board-effects')].at(-1);
    const cues = [];
    const announced = [];
    const feedback = new GameFeedback(
      renderer,
      { burst() {} },
      {
        effect(type, amount) {
          cues.push([type, amount]);
        },
      },
      {
        announce(lines) {
          announced.push(lines);
        },
        cancel() {},
      },
    );
    const measure = () => {
      const pixels = effects
        .getContext('2d')
        .getImageData(0, 0, effects.width, effects.height).data;
      const bounds = effects.getBoundingClientRect();
      const board = canvas.getBoundingClientRect();
      let visible = 0;
      let outside = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] < 24) continue;
        visible++;
        const x = bounds.left + (((index / 4) % effects.width) * bounds.width) / effects.width;
        const y =
          bounds.top + (Math.floor(index / 4 / effects.width) * bounds.height) / effects.height;
        if (x < board.left || x > board.right || y < board.top || y > board.bottom) outside++;
      }
      return { visible, outside };
    };
    const tiers = [];
    try {
      for (const difficulty of ['flow', 'rush']) {
        for (let lines = 1; lines <= 6; lines++) {
          renderer.reset();
          feedback.reset();
          const game = new GameEngine('fusion', difficulty, () => 0.5, [lines]);
          game.start();
          game.drainEvents();
          game.lines = 9;
          const straight = polyominoesBySize[lines].find((piece) =>
            piece.cells.every((cell) => cell[1] === 0),
          );
          game.active = {
            ...straight,
            cells: rotateCells(straight.cells),
            x: game.width - 1,
            y: 0,
          };
          for (let row = game.height - lines; row < game.height; row++)
            game.board[row] = Array.from({ length: game.width }, (_, column) =>
              column === game.width - 1 ? null : 1,
            );
          const nextPiece = game.queue[0].id;
          game.hardDrop();
          const delay = game.clearDelayRemaining;
          const queueHeld = game.queue[0].id === nextPiece;
          const events = game.drainEvents();
          frame.style.width = `${game.width * 24}px`;
          renderer.resize();
          cues.length = 0;
          const now = lines * 5000;
          feedback.handle(events, game.width, now);
          let elapsed = 0;
          const advance = (duration) => {
            let remaining = duration;
            while (remaining > 1e-9) {
              const step = Math.min(1 / 60, remaining);
              game.update(step);
              elapsed += step;
              renderer.render(game, step, now / 1000 + elapsed);
              remaining -= step;
            }
          };
          advance(0.08);
          const burst = measure();
          const absentDuringBurst = game.active === null;
          const label = document.querySelector('#callout strong')?.textContent;
          const clear = events.find((event) => event.type === 'clear');
          advance(delay - elapsed - 0.001);
          const absentBeforeDeadline = game.active === null;
          advance(0.001);
          const spawnedAfterBurst = game.active?.id === nextPiece;
          const entryDebris = measure();
          advance(1.5 - elapsed);
          const faded = measure();
          tiers.push({
            difficulty,
            lines,
            delay,
            queueHeld,
            absentDuringBurst,
            absentBeforeDeadline,
            spawnedAfterBurst,
            entryDebris,
            actualLines: clear?.amount,
            label,
            expectedLabel: getClearTier(lines).label,
            burst,
            faded,
            clearCue: cues.find((cue) => cue[0] === 'clear')?.[1],
            levelDidNotOverride:
              events.some((event) => event.type === 'level') &&
              !cues.some((cue) => cue[0] === 'level'),
          });
        }
      }
      feedback.reset();
      feedback.handle([{ type: 'clear', amount: 1, cells: [], rows: [] }], 8, 40000, false);
      return { tiers, announced };
    } finally {
      renderer.dispose();
      feedback.reset();
      frame.remove();
    }
  });
  for (const tier of result.tiers) {
    assert.equal(tier.actualLines, tier.lines);
    assert.ok(Math.abs(tier.delay - (0.36 + (tier.lines - 1) * 0.06)) < 1e-9);
    assert.equal(tier.queueHeld, true);
    assert.equal(tier.absentDuringBurst, true);
    assert.equal(tier.absentBeforeDeadline, true);
    assert.equal(tier.spawnedAfterBurst, true);
    assert.equal(tier.label, tier.expectedLabel);
    assert.equal(tier.clearCue, tier.lines);
    assert.equal(tier.levelDidNotOverride, true);
    assert.ok(tier.burst.visible > 100, 'Each real clear needs a visible burst');
    assert.ok(
      tier.entryDebris.visible < tier.burst.visible * 0.35,
      'The next piece must arrive after the bright burst fades',
    );
    assert.equal(tier.faded.visible, 0, 'Clear debris must get out of the way promptly');
  }
  assert.ok(
    result.tiers[5].burst.visible > result.tiers[0].burst.visible * 1.5,
    'Six-line blast must visibly exceed a single',
  );
  assert.ok(result.tiers[5].burst.outside > 100, 'Large explosions must escape the well');
  assert.deepEqual(result.announced, [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]);
  return result;
}
