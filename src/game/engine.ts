import { normalizeCells, polyominoesBySize, rotateCells } from './shapes';
import { PIECE_SIZES, PURE_MODES } from './types';
import type {
  ActivePiece,
  Cell,
  CellMark,
  Difficulty,
  GameEvent,
  GameStatus,
  Mode,
  Piece,
  PieceSize,
} from './types';

const lockDelay = 0.5;
const maximumLockResets = 15;
const epsilon = 1e-9;
const clearPoints = [0, 100, 300, 500, 800, 1200, 1600];
const rotationKicks: Cell[] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [-3, 0],
  [3, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
  [0, -2],
  [-1, -2],
  [1, -2],
  [0, -3],
  [-1, -3],
  [1, -3],
];

function copyPiece(piece: Piece): Piece {
  return { id: piece.id, color: piece.color, cells: piece.cells.map(([x, y]): Cell => [x, y]) };
}

function dimensions(cells: Cell[]): { width: number; height: number } {
  return {
    width: Math.max(...cells.map(([x]) => x)) + 1,
    height: Math.max(...cells.map(([, y]) => y)) + 1,
  };
}

export class GameEngine {
  readonly width: number;
  readonly height = 22;
  readonly mode: Mode;
  readonly difficulty: Difficulty;
  readonly pieceSizes: readonly PieceSize[];
  readonly recordKey: string;
  board: (number | null)[][];
  active: ActivePiece | null = null;
  held: Piece | null = null;
  queue: Piece[] = [];
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  charge = 0;
  status: GameStatus = 'ready';
  elapsed = 0;
  softDrop = false;
  private readonly random: () => number;
  private shapeBags = new Map<PieceSize, Piece[]>();
  private sizeBag: PieceSize[] = [];
  private events: GameEvent[] = [];
  private holdUsed = false;
  private gravityElapsed = 0;
  private lockElapsed = 0;
  private lockResets = 0;
  private clearDelay = 0;

  constructor(
    mode: Mode = 'pentris',
    difficulty: Difficulty = 'flow',
    random: () => number = Math.random,
    fusionSizes: readonly PieceSize[] = [5, 6],
  ) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.random = random;
    if (mode === 'fusion') {
      if (fusionSizes.length === 0 || fusionSizes.some((size) => !PIECE_SIZES.includes(size))) {
        throw new RangeError('Fusion requires at least one piece size from one to six.');
      }
      this.pieceSizes = Object.freeze(
        [...new Set(fusionSizes)].sort((first, second) => first - second),
      );
    } else {
      this.pieceSizes = Object.freeze([PURE_MODES.find((entry) => entry.mode === mode)!.size]);
    }
    this.recordKey =
      mode === 'fusion' && this.pieceSizes.join('-') !== '5-6'
        ? 'fusion-' + this.pieceSizes.join('-')
        : mode;
    const largestSize = this.pieceSizes[this.pieceSizes.length - 1];
    this.width = largestSize <= 2 ? 8 : largestSize <= 4 ? 10 : largestSize === 5 ? 12 : 14;
    this.board = this.emptyBoard();
    this.fillQueue();
  }

  start(): void {
    this.board = this.emptyBoard();
    this.active = null;
    this.held = null;
    this.queue = [];
    this.shapeBags.clear();
    this.sizeBag = [];
    this.events = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = 0;
    this.charge = 0;
    this.elapsed = 0;
    this.softDrop = false;
    this.holdUsed = false;
    this.clearDelay = 0;
    this.status = 'playing';
    this.fillQueue();
    this.spawnNext();
  }

  update(deltaSeconds: number): void {
    if (this.status !== 'playing' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    let remaining = deltaSeconds;
    // Step through entry, gravity and lock deadlines so long frames preserve each phase.
    while (remaining > epsilon && this.status === 'playing') {
      if (this.clearDelay > 0) {
        const step = Math.min(remaining, this.clearDelay);
        this.elapsed += step;
        this.clearDelay -= step;
        remaining -= step;
        if (this.clearDelay <= epsilon) {
          this.clearDelay = 0;
          this.spawnNext();
        }
        continue;
      }
      if (!this.active) break;
      const grounded = !this.fits(this.active, this.active.x, this.active.y + 1);
      const interval = this.softDrop
        ? 0.035
        : Math.max(
            0.065,
            (this.difficulty === 'flow' ? 0.9 : 0.55) * Math.pow(0.82, this.level - 1),
          );
      const untilGravity = Math.max(0, interval - this.gravityElapsed);
      const untilLock = grounded
        ? Math.max(0, lockDelay - this.lockElapsed)
        : Number.POSITIVE_INFINITY;
      const step = Math.min(remaining, untilGravity, untilLock);
      this.elapsed += step;
      this.gravityElapsed += step;
      if (grounded) this.lockElapsed += step;
      remaining -= step;
      if (grounded && this.lockElapsed >= lockDelay - epsilon) {
        this.lockActive();
        continue;
      }
      if (this.gravityElapsed >= interval - epsilon) {
        this.gravityElapsed = 0;
        if (this.fits(this.active, this.active.x, this.active.y + 1)) {
          this.active.y += 1;
          if (this.softDrop) this.score += 1;
        }
      }
    }
  }

  move(direction: number): boolean {
    if (
      this.status !== 'playing' ||
      this.clearDelay > 0 ||
      !this.active ||
      !Number.isFinite(direction) ||
      direction === 0
    )
      return false;
    const nextX = this.active.x + Math.sign(direction);
    if (!this.fits(this.active, nextX, this.active.y)) return false;
    this.resetGroundedLock();
    this.active.x = nextX;
    this.events.push({ type: 'move' });
    return true;
  }

  rotate(direction: 1 | -1 = 1): boolean {
    if (this.status !== 'playing' || this.clearDelay > 0 || !this.active) return false;
    const cells = rotateCells(this.active.cells, direction);
    const previous = dimensions(this.active.cells);
    const next = dimensions(cells);
    const centerX = this.active.x + Math.trunc((previous.width - next.width) / 2);
    const centerY = this.active.y + Math.trunc((previous.height - next.height) / 2);
    const rotated: Piece = { ...this.active, cells };
    for (const [offsetX, offsetY] of rotationKicks) {
      const x = centerX + offsetX;
      const y = centerY + offsetY;
      if (!this.fits(rotated, x, y)) continue;
      this.resetGroundedLock();
      this.active.cells = cells;
      this.active.x = x;
      this.active.y = y;
      this.events.push({ type: 'rotate' });
      return true;
    }
    return false;
  }

  hardDrop(): boolean {
    if (this.status !== 'playing' || this.clearDelay > 0 || !this.active) return false;
    const distance = this.ghostY - this.active.y;
    this.active.y += distance;
    this.score += distance * 2;
    this.events.push({ type: 'drop', distance, cells: this.activeMarks() });
    this.lockActive();
    return true;
  }

  hold(): boolean {
    if (this.status !== 'playing' || this.clearDelay > 0 || !this.active || this.holdUsed)
      return false;
    const previous = this.held;
    const original = Object.values(polyominoesBySize)
      .flat()
      .find((piece) => piece.id === this.active!.id);
    this.held = copyPiece(original ?? { ...this.active, cells: normalizeCells(this.active.cells) });
    this.events.push({ type: 'hold' });
    if (previous) this.spawn(previous);
    else this.spawnNext();
    this.holdUsed = true;
    return true;
  }

  activateResonance(): boolean {
    if (
      this.status !== 'playing' ||
      this.clearDelay > 0 ||
      this.charge < 100 ||
      !this.board.some((row) => row.some((cell) => cell !== null))
    )
      return false;
    const rows = Array.from({ length: 4 }, (_, index) => this.height - 4 + index);
    const cells = this.rowMarks(rows);
    this.board = [
      ...Array.from({ length: 4 }, () => this.emptyRow()),
      ...this.board.slice(0, this.height - 4),
    ];
    this.charge = 0;
    this.score += 400 * this.level;
    this.lockElapsed = 0;
    this.events.push({ type: 'resonance', rows, cells, amount: cells.length });
    if (this.active) {
      while (!this.fits(this.active, this.active.x, this.active.y)) this.active.y -= 1;
    }
    return true;
  }

  setPaused(paused: boolean): void {
    if (paused && this.status === 'playing') {
      this.status = 'paused';
      this.softDrop = false;
    } else if (!paused && this.status === 'paused') {
      this.status = 'playing';
    }
  }

  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  get ghostY(): number {
    if (!this.active) return 0;
    let y = this.active.y;
    while (this.fits(this.active, this.active.x, y + 1)) y += 1;
    return y;
  }

  /** Simulation seconds until the next piece enters after a line clear. */
  get clearDelayRemaining(): number {
    return this.clearDelay;
  }

  private emptyRow(): (number | null)[] {
    return Array<number | null>(this.width).fill(null);
  }

  private emptyBoard(): (number | null)[][] {
    return Array.from({ length: this.height }, () => this.emptyRow());
  }

  private shuffle<Value>(values: readonly Value[]): Value[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const other = Math.floor(this.random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
  }

  private drawPiece(): Piece {
    if (this.sizeBag.length === 0) this.sizeBag = this.shuffle(this.pieceSizes);
    const size = this.sizeBag.pop()!;
    let bag = this.shapeBags.get(size);
    if (!bag || bag.length === 0) {
      bag = this.shuffle(polyominoesBySize[size]);
      this.shapeBags.set(size, bag);
    }
    return copyPiece(bag.pop()!);
  }

  private fillQueue(): void {
    while (this.queue.length < 5) this.queue.push(this.drawPiece());
  }

  private spawnNext(): void {
    const next = this.queue.shift()!;
    this.fillQueue();
    this.spawn(next);
  }

  private spawn(piece: Piece): void {
    const copy = copyPiece(piece);
    const width = dimensions(copy.cells).width;
    this.active = { ...copy, x: Math.floor((this.width - width) / 2), y: 0 };
    this.gravityElapsed = 0;
    this.lockElapsed = 0;
    this.lockResets = 0;
    if (!this.fits(this.active, this.active.x, this.active.y)) this.gameOver();
  }

  private fits(piece: Piece, x: number, y: number): boolean {
    return piece.cells.every(([cellX, cellY]) => {
      const boardX = x + cellX;
      const boardY = y + cellY;
      return (
        boardX >= 0 &&
        boardX < this.width &&
        boardY < this.height &&
        (boardY < 0 || this.board[boardY][boardX] === null)
      );
    });
  }

  private resetGroundedLock(): void {
    if (
      this.active &&
      !this.fits(this.active, this.active.x, this.active.y + 1) &&
      this.lockResets < maximumLockResets
    ) {
      this.lockElapsed = 0;
      this.lockResets += 1;
    }
  }

  private activeMarks(): CellMark[] {
    const active = this.active!;
    return active.cells.map(([x, y]) => ({
      x: active.x + x,
      y: active.y + y,
      color: active.color,
    }));
  }

  private rowMarks(rows: number[]): CellMark[] {
    return rows.flatMap((y) =>
      this.board[y].flatMap((color, x) => (color === null ? [] : [{ x, y, color }])),
    );
  }

  private lockActive(): void {
    const cells = this.activeMarks();
    if (cells.some((cell) => cell.y < 0)) {
      this.gameOver();
      return;
    }
    for (const cell of cells) this.board[cell.y][cell.x] = cell.color;
    this.events.push({ type: 'lock', cells });
    const rows = this.board.flatMap((row, index) =>
      row.every((cell) => cell !== null) ? [index] : [],
    );
    this.charge = Math.min(100, this.charge + 4 + rows.length * 18);
    if (rows.length > 0) {
      this.combo += 1;
      this.score +=
        (clearPoints[Math.min(6, rows.length)] +
          Math.max(0, rows.length - 6) * 400 +
          (this.combo - 1) * 50) *
        this.level;
      this.events.push({ type: 'clear', rows, cells: this.rowMarks(rows), amount: rows.length });
      const cleared = new Set(rows);
      this.board = [
        ...Array.from({ length: rows.length }, () => this.emptyRow()),
        ...this.board.filter((_, index) => !cleared.has(index)),
      ];
      this.lines += rows.length;
      const nextLevel = Math.floor(this.lines / 10) + 1;
      if (nextLevel !== this.level) {
        this.level = nextLevel;
        this.events.push({ type: 'level', amount: this.level });
      }
    } else {
      this.combo = 0;
    }
    this.holdUsed = false;
    if (rows.length > 0) {
      this.active = null;
      this.clearDelay = 0.36 + (Math.min(6, rows.length) - 1) * 0.06;
    } else {
      this.spawnNext();
    }
  }

  private gameOver(): void {
    this.status = 'over';
    this.active = null;
    this.clearDelay = 0;
    this.softDrop = false;
    this.events.push({ type: 'gameover' });
  }
}
