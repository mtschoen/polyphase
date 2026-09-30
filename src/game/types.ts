export type Mode = 'pentris' | 'sextris' | 'fusion';
export type Difficulty = 'flow' | 'rush';
export type Cell = [number, number];
export interface Piece { id: string; cells: Cell[]; color: number }
export interface ActivePiece extends Piece { x: number; y: number }
export interface CellMark { x: number; y: number; color: number }
export interface GameEvent {
  type: 'move' | 'rotate' | 'drop' | 'lock' | 'clear' | 'hold' | 'resonance' | 'gameover' | 'level';
  cells?: CellMark[];
  rows?: number[];
  amount?: number;
  distance?: number;
}
export type GameStatus = 'ready' | 'playing' | 'paused' | 'over';
export const COLORS = ['#67edc1', '#ff987a', '#a99cff', '#f1d58e', '#70caff', '#f49dcd', '#b4df77', '#e4e6ef'];
export const THEMES = [
  { name: 'Eventide', subtitle: 'A little closer to the infinite', primary: '#78e6c2', secondary: '#f39c7a' },
  { name: 'Afterglow', subtitle: 'Drift into the warm unknown', primary: '#ffa47d', secondary: '#d87fbf' },
  { name: 'Deep Blue', subtitle: 'Find your quiet in the current', primary: '#84caff', secondary: '#9891f8' },
];
