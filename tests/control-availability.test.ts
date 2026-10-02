import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';

describe('control availability', () => {
  it('soft drops one row without advancing simulation time for button activation', () => {
    const game = new GameEngine('monotris', 'flow', () => 0.37);
    expect(game.softDropOnce()).toBe(false);
    game.start();
    const y = game.active!.y;
    expect(game.softDropOnce()).toBe(true);
    expect(game.active!.y).toBe(y + 1);
    expect(game.score).toBe(1);
    expect(game.elapsed).toBe(0);
    expect(game.drainEvents()).toContainEqual({ type: 'softdrop' });
    game.active!.y = game.ghostY;
    expect(game.softDropOnce()).toBe(false);
    game.active = null;
    expect(game.softDropOnce()).toBe(false);
  });
  it('matches Hold availability to accepted swaps across pieces and pause', () => {
    const game = new GameEngine('monotris', 'flow', () => 0.37);
    expect(game.canHold).toBe(false);
    game.start();
    expect(game.canHold).toBe(true);
    expect(game.hold()).toBe(true);
    expect(game.canHold).toBe(false);
    expect(game.hold()).toBe(false);
    game.hardDrop();
    expect(game.canHold).toBe(true);
    game.setPaused(true);
    expect(game.canHold).toBe(false);
    game.setPaused(false);
    expect(game.canHold).toBe(true);
    game.active = null;
    expect(game.canHold).toBe(false);
  });

  it('exposes Resonance only when a charged sweep can be performed', () => {
    const game = new GameEngine('monotris', 'flow', () => 0.37);
    game.start();
    game.charge = 100;
    expect(game.canResonate).toBe(false);
    game.board[game.height - 1][0] = 1;
    game.charge = 99;
    expect(game.canResonate).toBe(false);
    game.charge = 100;
    expect(game.canResonate).toBe(true);
    game.setPaused(true);
    expect(game.canResonate).toBe(false);
    game.setPaused(false);
    expect(game.activateResonance()).toBe(true);
    expect(game.canResonate).toBe(false);
    expect(game.board[game.height - 1].every((cell) => cell === null)).toBe(true);
  });

  it('disables both special actions through the clear animation', () => {
    const game = new GameEngine('monotris', 'flow', () => 0.37);
    game.start();
    game.board[game.height - 1].fill(1);
    game.board[game.height - 1][game.active!.x] = null;
    game.board[game.height - 2][0] = 1;
    game.charge = 100;
    game.hardDrop();
    expect(game.clearDelayRemaining).toBeGreaterThan(0);
    expect(game.canHold).toBe(false);
    expect(game.canResonate).toBe(false);
    expect(game.softDropOnce()).toBe(false);
    game.update(game.clearDelayRemaining);
    expect(game.canHold).toBe(true);
    expect(game.canResonate).toBe(true);
  });
});
