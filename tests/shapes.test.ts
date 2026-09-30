import { describe, expect, it } from 'vitest';
import {
  generatePolyominoes,
  hexominoes,
  normalizeCells,
  pentominoes,
  rotateCells,
} from '../src/game/shapes';
import type { Cell } from '../src/game/types';

function signature(cells: Cell[]): string {
  return normalizeCells(cells)
    .map((cell) => cell.join(','))
    .join(';');
}

function freeSignature(cells: Cell[]): string {
  const signatures: string[] = [];
  for (const reflected of [false, true]) {
    let orientation = cells.map(([x, y]): Cell => [reflected ? -x : x, y]);
    for (let turn = 0; turn < 4; turn += 1) {
      signatures.push(signature(orientation));
      orientation = rotateCells(orientation, 1);
    }
  }
  return signatures.sort()[0];
}

describe('free polyomino library', () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 5],
    [5, 12],
    [6, 35],
  ])('enumerates all %i-cell shapes without rotated or mirrored duplicates', (size, count) => {
    const shapes = generatePolyominoes(size);
    expect(shapes).toHaveLength(count);
    expect(new Set(shapes.map(freeSignature)).size).toBe(count);
    for (const cells of shapes) {
      expect(cells).toHaveLength(size);
      const reached = new Set([cells[0].join(',')]);
      let previousSize = -1;
      while (previousSize !== reached.size) {
        previousSize = reached.size;
        for (const [x, y] of cells) {
          if (
            [
              [x - 1, y],
              [x + 1, y],
              [x, y - 1],
              [x, y + 1],
            ].some((neighbor) => reached.has(neighbor.join(',')))
          ) {
            reached.add([x, y].join(','));
          }
        }
      }
      expect(reached.size).toBe(size);
    }
  });

  it('preserves shapes through four rotations and inverse turns', () => {
    for (const piece of [...pentominoes, ...hexominoes]) {
      let orientation = piece.cells;
      for (let turn = 0; turn < 4; turn += 1) orientation = rotateCells(orientation, 1);
      expect(orientation).toEqual(normalizeCells(piece.cells));
      expect(rotateCells(rotateCells(piece.cells, 1), -1)).toEqual(normalizeCells(piece.cells));
    }
    expect(new Set([...pentominoes, ...hexominoes].map((piece) => piece.id)).size).toBe(47);
  });

  it('normalizes translated cells without changing the input', () => {
    const cells: Cell[] = [
      [3, -2],
      [2, -1],
      [2, -2],
    ];
    expect(normalizeCells(cells)).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ]);
    expect(cells).toEqual([
      [3, -2],
      [2, -1],
      [2, -2],
    ]);
    expect(normalizeCells([])).toEqual([]);
    expect(rotateCells([], 1)).toEqual([]);
  });

  it.each([0, 7, 2.5, Number.NaN])('rejects unsupported shape size %s', (size) => {
    expect(() => generatePolyominoes(size)).toThrow(RangeError);
  });
});
