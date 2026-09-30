import { COLORS, type GameEvent, type Piece } from './game/types';
import type { GameEngine } from './game/engine';

import { BoardEffects } from './effects';

function drawBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity = 1,
  ghost = false,
): void {
  context.globalAlpha = opacity;
  const inset = Math.max(1.4, size * 0.065);
  const width = size - inset * 2;
  if (ghost) {
    context.fillStyle = `${color}0d`;
    context.fillRect(x + inset, y + inset, width, width);
    context.strokeStyle = `${color}66`;
    context.lineWidth = 1;
    context.strokeRect(x + inset + 0.5, y + inset + 0.5, width - 1, width - 1);
  } else {
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}99`);
    context.fillStyle = gradient;
    context.shadowColor = color;
    context.shadowBlur = size * 0.2;
    context.beginPath();
    context.roundRect(x + inset, y + inset, width, width, Math.max(1.5, size * 0.07));
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#ffffff35';
    context.fillRect(x + inset + 2, y + inset + 2, width - 4, 1);
    context.fillStyle = '#ffffff12';
    context.fillRect(x + inset + 2, y + inset + 3, 1, width - 6);
    context.fillStyle = '#072d281f';
    context.fillRect(x + inset + 2, y + size - inset - 3, width - 4, 1);
  }
  context.globalAlpha = 1;
}

export function drawPreview(canvas: HTMLCanvasElement, piece: Piece | null): void {
  const context = canvas.getContext('2d')!;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);
  if (!piece) {
    context.strokeStyle = '#9cb8a324';
    context.lineWidth = 1;
    context.setLineDash([3, 4]);
    context.strokeRect(width / 2 - 14, height / 2 - 10, 28, 20);
    return;
  }
  const shapeWidth = Math.max(...piece.cells.map((cell) => cell[0])) + 1;
  const shapeHeight = Math.max(...piece.cells.map((cell) => cell[1])) + 1;
  const size = Math.min(17, (width - 10) / shapeWidth, (height - 10) / shapeHeight);
  const left = (width - shapeWidth * size) / 2;
  const top = (height - shapeHeight * size) / 2;
  for (const [x, y] of piece.cells)
    drawBlock(context, left + x * size, top + y * size, size, COLORS[piece.color % COLORS.length]);
}

export class BoardRenderer {
  reducedMotion = false;
  showGhost = true;
  private context: CanvasRenderingContext2D;
  private effects: BoardEffects;
  private observer: ResizeObserver;
  private width = 0;
  private height = 0;
  constructor(
    private canvas: HTMLCanvasElement,
    frame: HTMLElement,
  ) {
    this.context = canvas.getContext('2d')!;
    this.effects = new BoardEffects(canvas, frame);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }
  resize(): void {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  reset(): void {
    this.effects.reset();
  }
  handle(event: GameEvent, width: number): void {
    if (this.reducedMotion) return;
    this.effects.handle(event, width);
  }
  render(game: GameEngine, delta: number, time: number): void {
    const context = this.context;
    const size = this.width / game.width;
    context.clearRect(0, 0, this.width, this.height);
    context.strokeStyle = '#8abba10c';
    context.lineWidth = 0.5;
    context.beginPath();
    for (let column = 1; column < game.width; column++) {
      context.moveTo(column * size, 0);
      context.lineTo(column * size, this.height);
    }
    for (let row = 1; row < game.height; row++) {
      context.moveTo(0, row * size);
      context.lineTo(this.width, row * size);
    }
    context.stroke();
    if (game.status === 'ready') this.drawDemo(game.width, game.height, size, time);
    else {
      for (let y = 0; y < game.height; y++)
        for (let x = 0; x < game.width; x++) {
          const color = game.board[y][x];
          if (color !== null)
            drawBlock(context, x * size, y * size, size, COLORS[color % COLORS.length], 0.86);
        }
      if (game.active) {
        const piece = game.active;
        const color = COLORS[piece.color % COLORS.length];
        if (this.showGhost && game.status !== 'over') {
          for (const [x, y] of piece.cells)
            drawBlock(
              context,
              (piece.x + x) * size,
              (game.ghostY + y) * size,
              size,
              color,
              1,
              true,
            );
        }
        for (const [x, y] of piece.cells)
          if (piece.y + y >= 0)
            drawBlock(context, (piece.x + x) * size, (piece.y + y) * size, size, color);
      }
      if (game.board.slice(0, 5).some((row) => row.some((cell) => cell !== null))) {
        const gradient = context.createLinearGradient(0, 0, 0, size * 7);
        gradient.addColorStop(0, '#ff886c22');
        gradient.addColorStop(1, '#ff886c00');
        context.fillStyle = gradient;
        context.fillRect(0, 0, this.width, size * 7);
      }
    }
    this.effects.render(delta, size, this.reducedMotion);
  }
  private drawDemo(width: number, height: number, size: number, time: number): void {
    const heights = [3, 4, 4, 2, 2, 3, 5, 4, 2, 3, 3, 2, 4, 3];
    for (let column = 0; column < width; column++)
      for (let row = 0; row < heights[column]; row++) {
        drawBlock(
          this.context,
          column * size,
          (height - 1 - row) * size,
          size,
          COLORS[Math.floor(column / 3) % COLORS.length],
          0.22,
        );
      }
    const offset = this.reducedMotion ? 0 : Math.sin(time * 0.4) * 0.15;
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ])
      drawBlock(
        this.context,
        (width / 2 - 1 + x) * size,
        (3 + y + offset) * size,
        size,
        COLORS[0],
        0.18,
      );
  }
  dispose(): void {
    this.observer.disconnect();
    this.effects.dispose();
  }
}
