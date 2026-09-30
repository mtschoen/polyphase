import { COLORS } from './types';
import type { Cell, Piece } from './types';

export function normalizeCells(cells: Cell[]): Cell[] {
  if (cells.length === 0) return [];
  const minimumX = Math.min(...cells.map(([x]) => x));
  const minimumY = Math.min(...cells.map(([, y]) => y));
  return cells
    .map(([x, y]): Cell => [x - minimumX, y - minimumY])
    .sort((first, second) => first[1] - second[1] || first[0] - second[0]);
}

export function rotateCells(cells: Cell[], direction: 1 | -1 = 1): Cell[] {
  return normalizeCells(cells.map(([x, y]): Cell => [-direction * y, direction * x]));
}

function cellKey(cells: Cell[]): string {
  return cells.map((cell) => cell.join(',')).join(';');
}

function canonicalCells(cells: Cell[]): Cell[] {
  const variants: Cell[][] = [];
  for (const reflected of [false, true]) {
    let orientation = normalizeCells(cells.map(([x, y]): Cell => [reflected ? -x : x, y]));
    for (let turn = 0; turn < 4; turn += 1) {
      variants.push(orientation);
      orientation = rotateCells(orientation);
    }
  }
  return variants.sort((first, second) => cellKey(first).localeCompare(cellKey(second)))[0];
}

// Growth is bounded at six cells and deduplicates all eight square-grid symmetries.
export function generatePolyominoes(cellCount: number): Cell[][] {
  if (!Number.isInteger(cellCount) || cellCount < 1 || cellCount > 6) {
    throw new RangeError('Polyomino size must be an integer from one to six.');
  }
  let shapes: Cell[][] = [[[0, 0]]];
  const neighbors: Cell[] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let size = 2; size <= cellCount; size += 1) {
    const candidates = new Map<string, Cell[]>();
    for (const shape of shapes) {
      const occupied = new Set(shape.map((cell) => cell.join(',')));
      for (const [x, y] of shape) {
        for (const [offsetX, offsetY] of neighbors) {
          const neighbor: Cell = [x + offsetX, y + offsetY];
          if (occupied.has(neighbor.join(','))) continue;
          const canonical = canonicalCells([...shape, neighbor]);
          candidates.set(cellKey(canonical), canonical);
        }
      }
    }
    shapes = [...candidates.values()];
  }
  return shapes.sort((first, second) => cellKey(first).localeCompare(cellKey(second)));
}

function createLibrary(size: number, prefix: string): Piece[] {
  return generatePolyominoes(size).map((cells, index) => {
    let orientation = cells;
    let widest = cells;
    for (let turn = 0; turn < 4; turn += 1) {
      if (Math.max(...orientation.map(([x]) => x)) > Math.max(...widest.map(([x]) => x))) {
        widest = orientation;
      }
      orientation = rotateCells(orientation);
    }
    return {
      id: prefix + '-' + String(index + 1).padStart(2, '0'),
      cells: normalizeCells(widest),
      color: index % COLORS.length,
    };
  });
}

export const pentominoes: readonly Piece[] = createLibrary(5, 'pentris');
export const hexominoes: readonly Piece[] = createLibrary(6, 'sextris');
