import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';
import { hexominoes, pentominoes } from '../src/game/shapes';
import { PURE_MODES } from '../src/game/types';
import type { Cell, Mode, PieceSize } from '../src/game/types';

function fresh(mode: Mode = 'pentris', difficulty: 'flow' | 'rush' = 'flow'): GameEngine {
  const game = new GameEngine(mode, difficulty, () => 0.37);
  game.start();
  game.drainEvents();
  return game;
}

function emptyBoard(game: GameEngine): void {
  game.board = Array.from({ length: game.height }, () =>
    Array<number | null>(game.width).fill(null),
  );
}

function place(game: GameEngine, cells: Cell[], x: number, y: number): void {
  game.active = { id: 'fixture', cells, color: 0, x, y };
}

const horizontal: Cell[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
];
const vertical: Cell[] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
];

function sequence(game: GameEngine, count: number): { id: string; size: number }[] {
  return Array.from({ length: count }, () => {
    const piece = { id: game.active!.id, size: game.active!.cells.length };
    game.hardDrop();
    emptyBoard(game);
    return piece;
  });
}

describe('fair piece sequence', () => {
  it.each([
    ['monotris', 1, 8, 1],
    ['ditris', 1, 8, 2],
    ['tritris', 2, 10, 3],
    ['tetris', 7, 10, 4],
    ['pentris', 18, 12, 5],
    ['sextris', 60, 14, 6],
  ] as const)('%s deals each shape once per bag', (mode, bagSize, width, size) => {
    const game = fresh(mode);
    const pieces = sequence(game, bagSize * 2);
    expect(game.width).toBe(width);
    expect(game.height).toBe(22);
    expect(pieces.every((piece) => piece.size === size)).toBe(true);
    expect(new Set(pieces.slice(0, bagSize).map((piece) => piece.id)).size).toBe(bagSize);
    expect(new Set(pieces.slice(bagSize).map((piece) => piece.id)).size).toBe(bagSize);
    expect(game.queue).toHaveLength(5);
    expect(game.pieceSizes).toEqual([size]);
    expect(game.recordKey).toBe(mode);
    expect(PURE_MODES.find((entry) => entry.mode === mode)?.size).toBe(size);
  });

  it('balances Fusion sizes while preserving independent complete shape bags', () => {
    const game = fresh('fusion');
    const pieces = sequence(game, 120);
    expect(game.pieceSizes).toEqual([5, 6]);
    expect(game.recordKey).toBe('fusion');
    for (let index = 0; index < pieces.length; index += 2) {
      expect(
        pieces
          .slice(index, index + 2)
          .map((piece) => piece.size)
          .sort(),
      ).toEqual([5, 6]);
    }
    expect(
      new Set(
        pieces
          .filter((piece) => piece.size === 5)
          .slice(0, 18)
          .map((piece) => piece.id),
      ).size,
    ).toBe(18);
    expect(new Set(pieces.filter((piece) => piece.size === 6).map((piece) => piece.id)).size).toBe(
      60,
    );
  });

  it('balances custom Fusion size cycles and keeps independent complete shape bags', () => {
    const game = new GameEngine('fusion', 'flow', () => 0.37, [3, 5, 6]);
    game.start();
    const pieces = sequence(game, 180);
    expect(game.width).toBe(14);
    expect(game.recordKey).toBe('fusion-3-5-6');
    for (let index = 0; index < pieces.length; index += 3) {
      expect(
        pieces
          .slice(index, index + 3)
          .map((piece) => piece.size)
          .sort(),
      ).toEqual([3, 5, 6]);
    }
    for (const [size, count] of [
      [3, 2],
      [5, 18],
      [6, 60],
    ]) {
      const selected = pieces.filter((piece) => piece.size === size);
      for (let index = 0; index + count <= selected.length; index += count) {
        expect(new Set(selected.slice(index, index + count).map((piece) => piece.id)).size).toBe(
          count,
        );
      }
    }
  });

  it.each([
    [[1], 8, 'fusion-1'],
    [[2, 4], 10, 'fusion-2-4'],
    [[5], 12, 'fusion-5'],
    [[6], 14, 'fusion-6'],
  ] as const)(
    'supports Fusion selection %s through hold and restart',
    (sizes, width, recordKey) => {
      const game = new GameEngine('fusion', 'flow', () => 0.37, sizes);
      game.start();
      expect(game.width).toBe(width);
      expect(game.recordKey).toBe(recordKey);
      game.hold();
      expect(sizes).toContain(game.held!.cells.length);
      expect(
        sequence(game, 12).every((piece) => (sizes as readonly number[]).includes(piece.size)),
      ).toBe(true);
      game.start();
      expect(game.held).toBeNull();
      expect(game.pieceSizes).toEqual(sizes);
      expect(
        sequence(game, 12).every((piece) => (sizes as readonly number[]).includes(piece.size)),
      ).toBe(true);
    },
  );

  it('normalizes and defensively copies Fusion sizes while preserving the legacy record key', () => {
    const sizes: PieceSize[] = [6, 5, 6];
    const game = new GameEngine('fusion', 'flow', () => 0.37, sizes);
    sizes.splice(0, sizes.length, 1);
    expect(game.pieceSizes).toEqual([5, 6]);
    expect(game.recordKey).toBe('fusion');
    game.start();
    expect(sequence(game, 12).every((piece) => [5, 6].includes(piece.size))).toBe(true);
  });

  it.each([[], [0], [7], [2.5], [Number.NaN], [3, 8]].map((sizes) => [sizes]))(
    'rejects invalid Fusion sizes %s',
    (sizes) => {
      expect(() => new GameEngine('fusion', 'flow', () => 0.37, sizes as PieceSize[])).toThrow(
        RangeError,
      );
    },
  );

  it('uses the pure mode size regardless of an unused Fusion selection', () => {
    const game = new GameEngine('tetris', 'flow', () => 0.37, []);
    game.start();
    expect(game.pieceSizes).toEqual([4]);
    expect(sequence(game, 14).every((piece) => piece.size === 4)).toBe(true);
  });

  it('does not mutate library cells when an active piece rotates', () => {
    const before = JSON.stringify([...pentominoes, ...hexominoes]);
    const game = fresh();
    game.rotate();
    game.hold();
    expect(JSON.stringify([...pentominoes, ...hexominoes])).toBe(before);
  });
});

describe('piece actions', () => {
  it('rejects wall and occupied-cell moves without emitting movement events', () => {
    const game = fresh();
    place(game, horizontal, 0, 2);
    expect(game.move(-1)).toBe(false);
    expect(game.move(0)).toBe(false);
    game.board[2][5] = 0;
    expect(game.move(1)).toBe(false);
    expect(game.drainEvents()).toEqual([]);
    game.board[2][5] = null;
    expect(game.move(1)).toBe(true);
    expect(game.active!.x).toBe(1);
    expect(game.drainEvents().map((event) => event.type)).toEqual(['move']);
  });

  it.each([0, 13])('rotates a six-long piece by kicking away from wall x=%i', (x) => {
    const game = fresh('sextris');
    place(game, vertical, x, 4);
    expect(game.rotate()).toBe(true);
    expect(
      game.active!.cells.every(([cellX, cellY]) => {
        const boardX = cellX + game.active!.x;
        const boardY = cellY + game.active!.y;
        return boardX >= 0 && boardX < game.width && boardY < game.height;
      }),
    ).toBe(true);
    expect(Math.max(...game.active!.cells.map(([cellX]) => cellX))).toBe(5);
  });

  it('kicks off the floor and preserves position through four unobstructed turns', () => {
    const game = fresh('sextris');
    place(game, vertical, 4, 4);
    for (let turn = 0; turn < 4; turn += 1) expect(game.rotate()).toBe(true);
    expect(game.active).toMatchObject({ x: 4, y: 4, cells: vertical });
    place(game, horizontal, 3, 21);
    expect(game.rotate(-1)).toBe(true);
    expect(game.active!.y + Math.max(...game.active!.cells.map(([, y]) => y))).toBe(21);
  });

  it('rejects rotation when every bounded kick is obstructed', () => {
    const game = fresh();
    game.board = game.board.map((row) => row.map(() => 1));
    for (const [x, y] of horizontal) game.board[10 + y][3 + x] = null;
    place(game, horizontal, 3, 10);
    const before = structuredClone(game.active);
    expect(game.rotate()).toBe(false);
    expect(game.active).toEqual(before);
  });

  it('lands the ghost above occupied cells and hard drops with distance scoring', () => {
    const game = fresh();
    place(
      game,
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      3,
      0,
    );
    game.board[20][3] = 0;
    expect(game.ghostY).toBe(16);
    expect(game.hardDrop()).toBe(true);
    expect(game.score).toBe(32);
    expect(game.board[19][3]).toBe(0);
    expect(game.board[20][3]).toBe(0);
    expect(game.drainEvents()).toMatchObject([{ type: 'drop', distance: 16 }, { type: 'lock' }]);
  });

  it.each(PURE_MODES)(
    '$name permits one hold per piece and restores held orientation',
    ({ mode }) => {
      const game = fresh(mode);
      const original = structuredClone(game.active!);
      game.rotate();
      expect(game.hold()).toBe(true);
      expect(game.held!.id).toBe(original.id);
      expect(game.held!.cells).toEqual(original.cells);
      expect(game.hold()).toBe(false);
      game.hardDrop();
      expect(game.hold()).toBe(true);
      expect(game.active!.id).toBe(original.id);
      expect(game.active!.cells).toEqual(original.cells);
      expect(game.active!.y).toBe(0);
    },
  );

  it('ends the game when a queued or held piece cannot spawn', () => {
    for (const action of ['drop', 'hold'] as const) {
      const game = fresh();
      place(game, horizontal, 0, 21);
      game.board[0].fill(1);
      game.board[0][game.width - 1] = null;
      if (action === 'drop') game.hardDrop();
      else game.hold();
      expect(game.status).toBe('over');
      expect(game.active).toBeNull();
      expect(game.drainEvents().filter((event) => event.type === 'gameover')).toHaveLength(1);
    }
  });

  it('tops out when a locked piece still extends above the board', () => {
    const game = fresh();
    place(game, horizontal, 0, -1);
    game.board[0][0] = 1;
    game.hardDrop();
    expect(game.status).toBe('over');
    expect(game.board[0][0]).toBe(1);
    expect(game.drainEvents().some((event) => event.type === 'lock')).toBe(false);
  });
});

describe('simulation and lock delay', () => {
  it.each([
    ['flow', 0.9],
    ['rush', 0.55],
  ] as const)('applies %s gravity using simulation time', (difficulty, interval) => {
    const game = fresh('pentris', difficulty);
    const initialY = game.active!.y;
    game.update(interval);
    expect(game.active!.y).toBe(initialY + 1);
    expect(game.elapsed).toBe(interval);
    expect(game.drainEvents()).toEqual([]);
  });

  it('scores accelerated soft drop without locking on first contact', () => {
    const game = fresh();
    place(game, horizontal, 3, 20);
    game.softDrop = true;
    game.update(0.035);
    expect(game.active!.y).toBe(21);
    expect(game.score).toBe(1);
    expect(game.board[21].every((cell) => cell === null)).toBe(true);
    expect(game.drainEvents()).toEqual([{ type: 'softdrop' }]);
    game.update(0.07);
    expect(game.drainEvents()).toEqual([]);
    game.update(0.5);
    expect(game.board[21].filter((cell) => cell !== null)).toHaveLength(5);
  });

  it('emits one soft-drop cue for each successful descent in a long update', () => {
    const game = fresh();
    place(game, horizontal, 3, 10);
    game.softDrop = true;
    game.update(0.105);
    expect(game.active!.y).toBe(13);
    expect(game.drainEvents().map((event) => event.type)).toEqual([
      'softdrop',
      'softdrop',
      'softdrop',
    ]);
  });

  it('locks after 500 ms on the floor and only permits fifteen movement resets', () => {
    const game = fresh();
    place(game, horizontal, 3, 21);
    game.update(0.49);
    for (let reset = 0; reset < 15; reset += 1) {
      expect(game.move(reset % 2 === 0 ? 1 : -1)).toBe(true);
      game.update(0.49);
      expect(game.board[21].every((cell) => cell === null)).toBe(true);
    }
    expect(game.move(-1)).toBe(true);
    game.update(0.02);
    expect(game.board[21].filter((cell) => cell !== null)).toHaveLength(5);
  });

  it('failed movement does not extend the lock deadline', () => {
    const game = fresh();
    place(game, horizontal, 0, 21);
    game.update(0.49);
    expect(game.move(-1)).toBe(false);
    game.update(0.02);
    expect(game.board[21].filter((cell) => cell !== null)).toHaveLength(5);
  });

  it('freezes paused time and rejects actions outside active play', () => {
    const game = new GameEngine();
    expect(game.ghostY).toBe(0);
    game.setPaused(false);
    game.update(1);
    expect(game.elapsed).toBe(0);
    expect(game.move(1)).toBe(false);
    expect(game.rotate()).toBe(false);
    expect(game.hardDrop()).toBe(false);
    expect(game.hold()).toBe(false);
    expect(game.activateResonance()).toBe(false);
    game.start();
    game.softDrop = true;
    game.setPaused(true);
    const active = structuredClone(game.active);
    game.update(100);
    expect(game.active).toEqual(active);
    expect(game.softDrop).toBe(false);
    expect(game.move(1)).toBe(false);
    game.setPaused(false);
    game.update(0.9);
    expect(game.active!.y).toBe(active!.y + 1);
    for (const delta of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) game.update(delta);
    expect(game.elapsed).toBe(0.9);
  });

  it('restart clears all accumulated run state', () => {
    const game = fresh();
    game.hold();
    game.hardDrop();
    game.update(1);
    game.lines = 22;
    game.level = 3;
    game.combo = 4;
    game.charge = 100;
    game.start();
    expect(game).toMatchObject({
      status: 'playing',
      score: 0,
      lines: 0,
      level: 1,
      combo: 0,
      charge: 0,
      elapsed: 0,
      held: null,
      softDrop: false,
    });
    expect(game.board.every((row) => row.every((cell) => cell === null))).toBe(true);
    expect(game.drainEvents()).toEqual([]);
  });
});

describe('clears and resonance', () => {
  it.each([
    [1, 100],
    [2, 300],
    [3, 500],
    [4, 800],
    [5, 1200],
    [6, 1600],
  ])('scores %i-line clears and collapses their rows', (count, points) => {
    const game = fresh('sextris');
    for (let row = game.height - count; row < game.height; row += 1) {
      game.board[row].fill(1);
      game.board[row][0] = null;
    }
    game.board[0][game.width - 1] = 2;
    place(
      game,
      Array.from({ length: count }, (_, y): Cell => [0, y]),
      0,
      game.height - count,
    );
    game.hardDrop();
    expect(game.lines).toBe(count);
    expect(game.score).toBe(points);
    expect(game.combo).toBe(1);
    expect(game.charge).toBe(Math.min(100, 4 + count * 18));
    expect(game.board[count][game.width - 1]).toBe(2);
    expect(game.board.slice(0, count).every((row) => row.every((cell) => cell === null))).toBe(
      true,
    );
    expect(game.drainEvents().find((event) => event.type === 'clear')).toMatchObject({
      amount: count,
      rows: Array.from({ length: count }, (_, index) => game.height - count + index),
    });
  });

  it('rewards consecutive clears, resets combos on misses, and advances levels', () => {
    const game = fresh();
    function clearOne(): void {
      game.board[21].fill(1);
      game.board[21][0] = null;
      place(game, [[0, 0]], 0, 21);
      game.hardDrop();
      game.update(game.clearDelayRemaining);
    }
    game.lines = 8;
    clearOne();
    clearOne();
    expect(game.score).toBe(250);
    expect(game.combo).toBe(2);
    expect(game.level).toBe(2);
    expect(game.drainEvents().find((event) => event.type === 'level')).toMatchObject({ amount: 2 });
    place(game, horizontal, 3, 21);
    game.hardDrop();
    expect(game.combo).toBe(0);
  });

  it('spends a full charge to remove four bottom rows without awarding line credit', () => {
    const game = fresh();
    expect(game.activateResonance()).toBe(false);
    game.charge = 100;
    expect(game.activateResonance()).toBe(false);
    game.board[21][0] = 0;
    game.board[16][1] = 2;
    expect(game.activateResonance()).toBe(true);
    expect(game.board[21][0]).toBeNull();
    expect(game.board[20][1]).toBe(2);
    expect(game.charge).toBe(0);
    expect(game.score).toBe(400);
    expect(game.lines).toBe(0);
    expect(game.drainEvents()).toMatchObject([
      { type: 'resonance', rows: [18, 19, 20, 21], cells: [{ x: 0, y: 21, color: 0 }] },
    ]);
  });

  it('keeps active cells collision-free when resonance moves an overhang downward', () => {
    const game = fresh();
    place(game, horizontal, 3, 4);
    game.board[0][3] = 1;
    game.charge = 100;
    game.activateResonance();
    expect(game.active!.y).toBe(3);
    expect(game.board[4][3]).toBe(1);
  });
});
