export type Mode = 'monotris' | 'ditris' | 'tritris' | 'tetris' | 'pentris' | 'sextris' | 'fusion';
export type PieceSize = 1 | 2 | 3 | 4 | 5 | 6;
export const PIECE_SIZES: readonly PieceSize[] = [1, 2, 3, 4, 5, 6];
export const PURE_MODES: readonly {
  mode: Exclude<Mode, 'fusion'>;
  size: PieceSize;
  name: string;
  shapeCount: number;
}[] = [
  { mode: 'monotris', size: 1, name: 'Monotris', shapeCount: 1 },
  { mode: 'ditris', size: 2, name: 'Ditris', shapeCount: 1 },
  { mode: 'tritris', size: 3, name: 'Tritris', shapeCount: 2 },
  { mode: 'tetris', size: 4, name: 'Tetris', shapeCount: 7 },
  { mode: 'pentris', size: 5, name: 'Pentris', shapeCount: 18 },
  { mode: 'sextris', size: 6, name: 'Sextris', shapeCount: 60 },
];
export type Difficulty = 'flow' | 'rush';
export type Cell = [number, number];
export interface Piece {
  id: string;
  cells: Cell[];
  color: number;
}
export interface ActivePiece extends Piece {
  x: number;
  y: number;
}
export interface CellMark {
  x: number;
  y: number;
  color: number;
}
export interface GameEvent {
  type:
    | 'move'
    | 'rotate'
    | 'softdrop'
    | 'drop'
    | 'lock'
    | 'clear'
    | 'hold'
    | 'resonance'
    | 'gameover'
    | 'level';
  cells?: CellMark[];
  rows?: number[];
  amount?: number;
  distance?: number;
}
export type GameStatus = 'ready' | 'playing' | 'paused' | 'over';
export const COLORS = [
  '#67edc1',
  '#ff987a',
  '#a99cff',
  '#f1d58e',
  '#70caff',
  '#f49dcd',
  '#b4df77',
  '#e4e6ef',
];
export const THEMES = [
  {
    name: 'Eventide',
    subtitle: 'A little closer to the infinite',
    primary: '#78e6c2',
    secondary: '#f39c7a',
  },
  {
    name: 'Afterglow',
    subtitle: 'Drift into the warm unknown',
    primary: '#ffa47d',
    secondary: '#d87fbf',
  },
  {
    name: 'Deep Blue',
    subtitle: 'Find your quiet in the current',
    primary: '#84caff',
    secondary: '#9891f8',
  },
];
