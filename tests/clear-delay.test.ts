import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';
import type { Cell, Difficulty } from '../src/game/types';

function prepareClear(lines = 1, difficulty: Difficulty = 'flow'): GameEngine {
  const game = new GameEngine('sextris', difficulty, () => 0.37);
  game.start();
  game.drainEvents();
  for (let row = game.height - lines; row < game.height; row++) {
    game.board[row].fill(1);
    game.board[row][0] = null;
  }
  game.active = {
    id: 'clear-fixture',
    color: 0,
    cells: Array.from({ length: lines }, (_, y): Cell => [0, y]),
    x: 0,
    y: game.height - lines,
  };
  return game;
}

describe('line-clear entry delay', () => {
  it.each(
    (['flow', 'rush'] as const).flatMap((difficulty) =>
      [1, 2, 3, 4, 5, 6].map((lines) => ({ difficulty, lines })),
    ),
  )('delays the next piece for $lines lines in $difficulty', ({ lines, difficulty }) => {
    const game = prepareClear(lines, difficulty);
    const queue = structuredClone(game.queue);
    const next = queue[0].id;
    game.hardDrop();
    expect(game.active).toBeNull();
    expect(game.status).toBe('playing');
    expect(game.queue).toEqual(queue);
    expect(game.lines).toBe(lines);
    expect(game.score).toBeGreaterThan(0);
    expect(game.drainEvents().some((event) => event.type === 'clear')).toBe(true);
    const delay = 0.36 + (lines - 1) * 0.06;
    expect(game.clearDelayRemaining).toBeCloseTo(delay);
    game.update(delay - 0.01);
    expect(game.active).toBeNull();
    expect(game.queue).toEqual(queue);
    game.update(0.01);
    expect(game.clearDelayRemaining).toBe(0);
    expect(game.active?.id).toBe(next);
    expect(game.active?.y).toBe(0);
    expect(game.queue).toHaveLength(5);
  });

  it('freezes the delay when paused, ignores controls, and resets on restart', () => {
    const game = prepareClear(6, 'rush');
    const clearingPiece = game.active;
    expect(game.hold()).toBe(true);
    game.active = clearingPiece;
    game.hardDrop();
    game.drainEvents();
    game.charge = 100;
    game.board[21][1] = 1;
    const board = structuredClone(game.board);
    const queue = structuredClone(game.queue);
    expect(game.move(1)).toBe(false);
    expect(game.rotate()).toBe(false);
    expect(game.hardDrop()).toBe(false);
    expect(game.hold()).toBe(false);
    expect(game.activateResonance()).toBe(false);
    expect(game.board).toEqual(board);
    expect(game.queue).toEqual(queue);
    expect(game.drainEvents()).toEqual([]);
    for (const delta of [0, -1, NaN, Infinity]) game.update(delta);
    expect(game.clearDelayRemaining).toBeCloseTo(0.66);
    game.update(0.2);
    const remaining = game.clearDelayRemaining;
    const elapsed = game.elapsed;
    game.setPaused(true);
    game.update(100);
    expect(game.clearDelayRemaining).toBe(remaining);
    expect(game.elapsed).toBe(elapsed);
    game.setPaused(false);
    game.update(remaining);
    expect(game.active).not.toBeNull();
    expect(game.hold()).toBe(true);
    const restarted = prepareClear(3);
    restarted.hardDrop();
    restarted.start();
    expect(restarted.clearDelayRemaining).toBe(0);
    expect(restarted.active?.y).toBe(0);
  });

  it.each(['flow', 'rush'] as const)(
    'uses leftover %s gravity equally for long and segmented updates',
    (difficulty) => {
      const long = prepareClear(2, difficulty);
      const segmented = prepareClear(2, difficulty);
      long.hardDrop();
      segmented.hardDrop();
      long.update(2.5);
      for (let segment = 0; segment < 25; segment++) segmented.update(0.1);
      expect(long.active).toEqual(segmented.active);
      expect(long.board).toEqual(segmented.board);
      expect(long.queue).toEqual(segmented.queue);
      expect(long.score).toBe(segmented.score);
      expect(long.elapsed).toBeCloseTo(segmented.elapsed);
      expect(long.active!.y).toBeGreaterThan(0);
    },
  );

  it('delays top-out until the next piece actually attempts to spawn', () => {
    const game = prepareClear();
    game.board[0].fill(1);
    game.board[0][0] = null;
    game.board[1].fill(1);
    game.board[1][0] = null;
    game.hardDrop();
    expect(game.status).toBe('playing');
    game.update(0.35);
    expect(game.status).toBe('playing');
    game.update(0.01);
    expect(game.status).toBe('over');
    expect(game.active).toBeNull();
    expect(game.clearDelayRemaining).toBe(0);
    expect(game.drainEvents().filter((event) => event.type === 'gameover')).toHaveLength(1);
  });

  it('crosses lock, clear pause, and gravity deadlines in one update', () => {
    const long = prepareClear();
    const segmented = prepareClear();
    long.update(1.76);
    for (const delta of [0.49, 0.01, 0.35, 0.01, 0.9]) segmented.update(delta);
    expect(long.active).toEqual(segmented.active);
    expect(long.active?.y).toBe(1);
    expect(long.lines).toBe(1);
    expect(long.elapsed).toBeCloseTo(1.76);
    expect(long.drainEvents()).toEqual(segmented.drainEvents());
  });

  it('does not advance or spin when playing without an active piece or a pending clear', () => {
    const game = new GameEngine();
    game.start();
    game.active = null;
    game.update(100);
    expect(game.elapsed).toBe(0);
    expect(game.active).toBeNull();
  });

  it('spawns immediately after a placement that clears no rows', () => {
    const game = new GameEngine('sextris', 'rush', () => 0.37);
    game.start();
    const next = game.queue[0].id;
    game.hardDrop();
    expect(game.active?.id).toBe(next);
    expect(game.clearDelayRemaining).toBe(0);
  });
});
