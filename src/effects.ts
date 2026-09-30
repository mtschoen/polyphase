import { COLORS, type GameEvent } from './game/types';

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maximumLife: number;
  size: number;
  color: string;
  shard: boolean;
}
interface Ring {
  x: number;
  y: number;
  age: number;
  strength: number;
}
interface Beam {
  row: number;
  age: number;
}
interface DropTrail {
  x: number;
  top: number;
  bottom: number;
  age: number;
  color: string;
}

export class BoardEffects {
  private canvas = document.createElement('canvas');
  private context: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private beams: Beam[] = [];
  private trails: DropTrail[] = [];
  private glows = new Map<string, HTMLCanvasElement>();
  private shake = 0;
  private width = 0;
  private height = 0;

  constructor(
    private board: HTMLCanvasElement,
    private frame: HTMLElement,
  ) {
    this.canvas.className = 'board-effects';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.append(this.canvas);
    this.context = this.canvas.getContext('2d')!;
    for (const color of COLORS) {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 64;
      const context = sprite.getContext('2d')!;
      const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.12, color);
      glow.addColorStop(0.4, `${color}66`);
      glow.addColorStop(1, `${color}00`);
      context.fillStyle = glow;
      context.fillRect(0, 0, 64, 64);
      this.glows.set(color, sprite);
    }
  }

  reset(): void {
    this.particles = [];
    this.rings = [];
    this.beams = [];
    this.trails = [];
    this.shake = 0;
    this.frame.style.transform = '';
    this.context.clearRect(0, 0, this.width, this.height);
  }

  handle(event: GameEvent, width: number): void {
    if (!event.cells?.length || !['drop', 'clear', 'resonance', 'lock'].includes(event.type))
      return;
    const strength = event.type === 'resonance' ? 4 : event.type === 'clear' ? 2 : 1;
    const isLock = event.type === 'lock';
    const count = isLock ? 7 : 14 + strength * 5;
    this.shake = Math.min(12, this.shake + (isLock ? 0.8 : strength * 2.5));
    if (event.rows) for (const row of event.rows) this.beams.push({ row, age: 0 });
    for (const cell of event.cells) {
      const color = COLORS[cell.color % COLORS.length];
      for (let index = 0; index < count; index++) {
        const angle = -Math.PI * (0.05 + Math.random() * 0.9);
        const speed = (isLock ? 2 : 4) + Math.random() * (3 + strength * 3);
        const life = (isLock ? 0.65 : 1) + Math.random() * 0.65;
        this.particles.push({
          x: cell.x + Math.random(),
          y: cell.y + 0.5,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          life,
          maximumLife: life,
          size: 0.065 + Math.random() * 0.1,
          color,
          shard: index % 3 === 0,
        });
      }
    }
    if (!isLock)
      this.rings.push({
        x: event.cells.reduce((sum, cell) => sum + cell.x + 0.5, 0) / event.cells.length,
        y: Math.max(...event.cells.map((cell) => cell.y)) + 0.5,
        age: 0,
        strength,
      });
    if (event.type === 'drop' && event.distance) {
      const columns = new Map(event.cells.map((cell) => [cell.x, cell]));
      for (const cell of columns.values())
        this.trails.push({
          x: cell.x + 0.5,
          top: cell.y - event.distance,
          bottom: cell.y + 1,
          age: 0,
          color: COLORS[cell.color % COLORS.length],
        });
    }
    const maximumParticles = width * 100;
    if (this.particles.length > maximumParticles)
      this.particles.splice(0, this.particles.length - maximumParticles);
    this.rings = this.rings.slice(-16);
    this.beams = this.beams.slice(-24);
    this.trails = this.trails.slice(-28);
  }

  render(delta: number, size: number, reducedMotion: boolean): void {
    const context = this.context;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (
      this.width !== window.innerWidth ||
      this.height !== window.innerHeight ||
      this.canvas.width !== Math.round(window.innerWidth * ratio)
    ) {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.round(this.width * ratio);
      this.canvas.height = Math.round(this.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    context.clearRect(0, 0, this.width, this.height);
    if (reducedMotion) {
      this.reset();
      return;
    }
    this.shake *= Math.exp(-15 * delta);
    this.frame.style.transform =
      this.shake > 0.1
        ? `translate3d(${(Math.random() - 0.5) * this.shake}px,${(Math.random() - 0.5) * this.shake}px,0)`
        : '';
    if (!this.particles.length && !this.rings.length && !this.beams.length && !this.trails.length)
      return;
    const bounds = this.board.getBoundingClientRect();
    context.save();
    context.translate(bounds.left + this.board.clientLeft, bounds.top + this.board.clientTop);
    context.globalCompositeOperation = 'lighter';
    this.drawTrails(delta, size);
    this.drawWaves(delta, size);
    this.drawParticles(delta, size);
    context.restore();
  }

  private drawTrails(delta: number, size: number): void {
    const context = this.context;
    for (const trail of this.trails) {
      trail.age += delta;
      context.globalAlpha = Math.max(0, 1 - trail.age / 0.32) * 0.65;
      const top = Math.max(0, trail.top) * size;
      const bottom = trail.bottom * size;
      const glow = context.createLinearGradient(0, top, 0, bottom);
      glow.addColorStop(0, `${trail.color}00`);
      glow.addColorStop(1, trail.color);
      context.fillStyle = glow;
      context.fillRect((trail.x - 0.36) * size, top, size * 0.72, bottom - top);
    }
    this.trails = this.trails.filter((trail) => trail.age < 0.32);
    context.globalAlpha = 1;
  }

  private drawWaves(delta: number, size: number): void {
    const context = this.context;
    for (const beam of this.beams) {
      beam.age += delta;
      context.globalAlpha = Math.max(0, 1 - beam.age / 0.5);
      context.fillStyle = '#baffdf';
      const thickness = Math.max(2, size * (1 - beam.age * 2));
      context.fillRect(
        -size,
        (beam.row + 0.5) * size - thickness / 2,
        this.board.clientWidth + size * 2,
        thickness,
      );
    }
    this.beams = this.beams.filter((beam) => beam.age < 0.5);
    for (const ring of this.rings) {
      ring.age += delta;
      context.globalAlpha = Math.max(0, 1 - ring.age / 0.8) * 0.8;
      context.strokeStyle = '#c3ffe6';
      context.lineWidth = 1.5 + ring.strength * 0.5;
      context.beginPath();
      context.ellipse(
        ring.x * size,
        ring.y * size,
        ring.age * size * 15,
        ring.age * size * 4,
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
    this.rings = this.rings.filter((ring) => ring.age < 0.8);
    context.globalAlpha = 1;
  }

  private drawParticles(delta: number, size: number): void {
    const context = this.context;
    for (const particle of this.particles) {
      particle.life -= delta;
      if (particle.life <= 0) continue;
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      particle.velocityY += delta * 8;
      particle.velocityX *= Math.exp(-delta * 0.8);
      const x = particle.x * size;
      const y = particle.y * size;
      const radius = Math.max(1.2, particle.size * size);
      context.globalAlpha = Math.min(1, (particle.life / particle.maximumLife) * 1.8);
      context.strokeStyle = particle.color;
      context.lineWidth = Math.max(1, radius * 0.55);
      context.beginPath();
      context.moveTo(x - particle.velocityX * size * 0.07, y - particle.velocityY * size * 0.07);
      context.lineTo(x, y);
      context.stroke();
      context.drawImage(
        this.glows.get(particle.color)!,
        x - radius * 4,
        y - radius * 4,
        radius * 8,
        radius * 8,
      );
      context.fillStyle = '#f5fff9';
      if (particle.shard) {
        context.save();
        context.translate(x, y);
        context.rotate(particle.life * 5);
        context.fillRect(-radius / 2, -radius / 2, radius, radius);
        context.restore();
      } else {
        context.beginPath();
        context.arc(x, y, radius * 0.4, 0, Math.PI * 2);
        context.fill();
      }
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  dispose(): void {
    this.reset();
    this.canvas.remove();
  }
}
