import { COLORS } from './types';
import type { Cell, Piece, PieceSize } from './types';

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

function createPiece(cells: Cell[], id: string, color: number): Piece {
  let orientation = cells;
  let widest = cells;
  for (let turn = 0; turn < 4; turn += 1) {
    if (Math.max(...orientation.map(([x]) => x)) > Math.max(...widest.map(([x]) => x))) {
      widest = orientation;
    }
    orientation = rotateCells(orientation);
  }
  return { id, cells: normalizeCells(widest), color };
}

function rotationKey(cells: Cell[]): string {
  const variants: string[] = [];
  let orientation = normalizeCells(cells);
  for (let turn = 0; turn < 4; turn += 1) {
    variants.push(cellKey(orientation));
    orientation = rotateCells(orientation);
  }
  return variants.sort()[0];
}

function createLibrary(size: PieceSize, prefix: string): Piece[] {
  const pieces = generatePolyominoes(size).map((cells, index) => {
    return createPiece(
      cells,
      prefix + '-' + String(index + 1).padStart(2, '0'),
      index % COLORS.length,
    );
  });
  // Rotation controls cannot reach a chiral piece's reflection, so include it in the bag.
  const mirrors = pieces.flatMap((piece) => {
    const reflected = piece.cells.map(([x, y]): Cell => [-x, y]);
    if (rotationKey(reflected) === rotationKey(piece.cells)) return [];
    return [createPiece(reflected, piece.id + '-mirror', piece.color)];
  });
  return [...pieces, ...mirrors];
}

export const polyominoesBySize: Readonly<Record<PieceSize, readonly Piece[]>> = {
  1: createLibrary(1, 'monotris'),
  2: createLibrary(2, 'ditris'),
  3: createLibrary(3, 'tritris'),
  4: createLibrary(4, 'tetris'),
  5: createLibrary(5, 'pentris'),
  6: createLibrary(6, 'sextris'),
};
export const pentominoes = polyominoesBySize[5];
export const hexominoes = polyominoesBySize[6];
