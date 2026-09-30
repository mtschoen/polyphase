import { getClearTier, type ClearTier } from './clear-tiers';
import { COLORS, type CellMark, type GameEvent } from './game/types';

const IMPACT_SCALE = 1.5;

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maximumLife: number;
  size: number;
  color: string;
  dust: boolean;
  ember: boolean;
  shard: boolean;
}
interface Blast {
  x: number;
  y: number;
  age: number;
  power: number;
  color: string;
}
interface Beam {
  row: number;
  age: number;
  color: string;
  power: number;
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
  private blasts: Blast[] = [];
  private beams: Beam[] = [];
  private trails: DropTrail[] = [];
  private glows = new Map<string, HTMLCanvasElement>();
  private application: HTMLElement;
  private screenShake = 0;
  private landingShake = 0;
  private width = 0;
  private height = 0;

  constructor(
    private board: HTMLCanvasElement,
    private frame: HTMLElement,
    private random: () => number = Math.random,
  ) {
    this.application = frame.closest<HTMLElement>('#app') ?? frame;
    this.canvas.className = 'board-effects';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.append(this.canvas);
    this.context = this.canvas.getContext('2d')!;
    const accents = Array.from({ length: 6 }, (_, index) => getClearTier(index + 1).accent);
    for (const color of [...COLORS, ...accents]) {
      if (this.glows.has(color)) continue;
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 64;
      const context = sprite.getContext('2d')!;
      const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, '#fff8e9');
      glow.addColorStop(0.1, color);
      glow.addColorStop(0.35, `${color}44`);
      glow.addColorStop(1, `${color}00`);
      context.fillStyle = glow;
      context.fillRect(0, 0, 64, 64);
      this.glows.set(color, sprite);
    }
  }

  reset(): void {
    this.particles = [];
    this.blasts = [];
    this.beams = [];
    this.trails = [];
    this.screenShake = this.landingShake = 0;
    this.frame.style.transform = '';
    this.application.style.transform = '';
    this.context.clearRect(0, 0, this.width, this.height);
  }

  handle(event: GameEvent, width: number): void {
    if (!event.cells?.length || !['drop', 'clear', 'resonance', 'lock'].includes(event.type))
      return;
    // Bound work at event ingestion as well as retained particles.
    const cells = event.cells.slice(0, Math.min(256, Math.max(1, width) * 6));
    if (event.type === 'drop') {
      this.addDropTrail(cells, event.distance ?? 0);
    } else if (event.type === 'lock') {
      this.landingShake = Math.min(2.5 * IMPACT_SCALE, this.landingShake + 1.6 * IMPACT_SCALE);
      this.emitParticles(cells, null);
    } else {
      const tier = getClearTier(
        event.type === 'resonance' ? 4 : (event.amount ?? event.rows?.length ?? 1),
      );
      this.screenShake = Math.min(
        42 * IMPACT_SCALE,
        this.screenShake + tier.shake * 1.25 * IMPACT_SCALE,
      );
      this.emitParticles(cells, tier);
      const rows = event.rows ?? [...new Set(cells.map((cell) => cell.y))];
      for (const row of rows.slice(0, 24))
        this.beams.push({ row, age: 0, color: tier.accent, power: tier.power });
      const centerX = cells.reduce((sum, cell) => sum + cell.x + 0.5, 0) / cells.length;
      const centerY = cells.reduce((sum, cell) => sum + cell.y + 0.5, 0) / cells.length;
      this.blasts.push({ x: centerX, y: centerY, age: 0, power: tier.power, color: tier.accent });
    }
    const maximumParticles = Math.round(Math.min(4200, Math.max(800, width * 280)) * IMPACT_SCALE);
    if (this.particles.length > maximumParticles)
      this.particles.splice(0, this.particles.length - maximumParticles);
    this.blasts = this.blasts.slice(-12);
    this.beams = this.beams.slice(-24);
    this.trails = this.trails.slice(-28);
  }

  private addDropTrail(cells: CellMark[], distance: number): void {
    if (distance <= 0) return;
    const columns = new Map<number, CellMark>();
    for (const cell of cells) {
      const previous = columns.get(cell.x);
      if (!previous || cell.y > previous.y) columns.set(cell.x, cell);
    }
    for (const cell of columns.values())
      this.trails.push({
        x: cell.x + 0.5,
        top: cell.y - distance,
        bottom: cell.y + 1,
        age: 0,
        color: COLORS[cell.color % COLORS.length],
      });
  }

  private emitParticles(cells: CellMark[], tier: ClearTier | null): void {
    const count = Math.round((tier ? tier.particlesPerCell * 3 : 32) * IMPACT_SCALE);
    for (const cell of cells) {
      for (let index = 0; index < count; index++) {
        const dust = !tier && index % 4 === 0;
        const angle = tier ? this.random() * Math.PI * 2 : -Math.PI * (0.05 + this.random() * 0.9);
        const speed = tier ? 5 + this.random() * (9 + tier.power * 4) : 3 + this.random() * 5;
        const ember = !!tier && index % 11 === 0;
        const life = tier
          ? ember
            ? 0.7 + this.random() * 0.25
            : 0.3 + tier.power * 0.035 + this.random() * 0.14
          : 0.46 + this.random() * 0.19;
        this.particles.push({
          x: cell.x + this.random(),
          y: cell.y + (tier ? this.random() : 0.9),
          velocityX: Math.cos(angle) * speed * (tier ? 1.35 : 1.15),
          velocityY: Math.sin(angle) * speed,
          life,
          maximumLife: life,
          size: 0.024 + this.random() * 0.025,
          color: dust
            ? '#b8cdc8'
            : tier && index % 3 === 0
              ? tier.accent
              : COLORS[cell.color % COLORS.length],
          dust,
          ember,
          shard: !!tier && index % 7 === 0,
        });
      }
    }
  }

  render(
    delta: number,
    size: number,
    reducedMotion: boolean,
    landingGuide: readonly { x: number; y: number }[] = [],
  ): void {
    const context = this.context;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (
      this.width !== window.innerWidth ||
      this.height !== window.innerHeight ||
      this.canvas.width !== Math.round(window.innerWidth * ratio) ||
      this.canvas.height !== Math.round(window.innerHeight * ratio)
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
    const elapsed = Math.max(0, Number.isFinite(delta) ? delta : 0);
    this.screenShake *= Math.exp(-8 * elapsed);
    this.landingShake *= Math.exp(-24 * elapsed);
    this.application.style.transform = this.shakeTransform(this.screenShake);
    if (this.application !== this.frame)
      this.frame.style.transform = this.shakeTransform(this.landingShake);
    else
      this.frame.style.transform = this.shakeTransform(
        Math.max(this.screenShake, this.landingShake),
      );
    if (!this.particles.length && !this.blasts.length && !this.beams.length && !this.trails.length)
      return;
    const bounds = this.board.getBoundingClientRect();
    context.save();
    context.translate(bounds.left + this.board.clientLeft, bounds.top + this.board.clientTop);
    context.globalCompositeOperation = 'lighter';
    this.drawTrails(elapsed, size);
    this.drawBlasts(elapsed, size);
    this.drawParticles(elapsed, size);
    // Remove the overlay over the guide so incoming pieces stay easy to place.
    context.globalCompositeOperation = 'destination-out';
    context.globalAlpha = 0.92;
    const inset = size * 0.035;
    for (const { x, y } of landingGuide)
      context.fillRect(x * size + inset, y * size + inset, size - inset * 2, size - inset * 2);
    context.restore();
  }

  private shakeTransform(amplitude: number): string {
    return amplitude > 0.1
      ? `translate3d(${(this.random() - 0.5) * amplitude * 2}px,${(this.random() - 0.5) * amplitude * 2}px,0)`
      : '';
  }

  private drawTrails(delta: number, size: number): void {
    const context = this.context;
    for (const trail of this.trails) {
      trail.age += delta;
      context.globalAlpha = Math.max(0, 1 - trail.age / 0.22) * 0.4 * IMPACT_SCALE;
      const top = Math.max(0, trail.top) * size;
      const bottom = trail.bottom * size;
      const glow = context.createLinearGradient(0, top, 0, bottom);
      glow.addColorStop(0, `${trail.color}00`);
      glow.addColorStop(1, trail.color);
      context.fillStyle = glow;
      context.fillRect(
        (trail.x - 0.18 * IMPACT_SCALE) * size,
        top,
        size * 0.36 * IMPACT_SCALE,
        bottom - top,
      );
    }
    this.trails = this.trails.filter((trail) => trail.age < 0.22);
    context.globalAlpha = 1;
  }

  private drawBlasts(delta: number, size: number): void {
    const context = this.context;
    for (const beam of this.beams) {
      beam.age += delta;
      const life = 0.2 + beam.power * 0.016;
      const opacity = Math.max(0, 1 - beam.age / life);
      context.globalAlpha = opacity;
      context.fillStyle = beam.color;
      const thickness = Math.max(1, size * (0.28 + beam.power * 0.04) * opacity) * IMPACT_SCALE;
      context.fillRect(
        -size * 2,
        (beam.row + 0.5) * size - thickness / 2,
        this.board.clientWidth + size * 4,
        thickness,
      );
      context.fillStyle = '#fff9e9';
      context.globalAlpha = Math.max(0, 1 - beam.age / 0.13) * 0.9;
      context.fillRect(
        -size,
        (beam.row + 0.5) * size - size * 0.045 * IMPACT_SCALE,
        this.board.clientWidth + size * 2,
        size * 0.09 * IMPACT_SCALE,
      );
    }
    this.beams = this.beams.filter((beam) => beam.age < 0.2 + beam.power * 0.016);
    for (const blast of this.blasts) {
      blast.age += delta;
      const life = 0.3 + blast.power * 0.045;
      const opacity = Math.max(0, 1 - blast.age / life);
      const x = blast.x * size;
      const y = blast.y * size;
      if (blast.age < 0.22) {
        const radius = size * (1.5 + blast.power * 0.9) * IMPACT_SCALE;
        context.globalAlpha = (1 - blast.age / 0.22) * 0.75;
        context.drawImage(
          this.glows.get(blast.color)!,
          x - radius,
          y - radius,
          radius * 2,
          radius * 2,
        );
      }
      context.globalAlpha = opacity ** 1.5 * 0.9;
      context.strokeStyle = blast.color;
      context.lineWidth = (1 + opacity * blast.power * 0.55) * IMPACT_SCALE;
      const radius = (0.6 + blast.age * (14 + blast.power * 7)) * size * IMPACT_SCALE;
      context.beginPath();
      context.ellipse(x, y, radius, radius * 0.65, 0, 0, Math.PI * 2);
      context.stroke();
      if (blast.power >= 3) {
        context.globalAlpha *= 0.5;
        context.beginPath();
        context.ellipse(x, y, radius * 0.72, radius * 0.72, 0, 0, Math.PI * 2);
        context.stroke();
      }
    }
    this.blasts = this.blasts.filter((blast) => blast.age < 0.3 + blast.power * 0.045);
    context.globalAlpha = 1;
  }

  private drawParticles(delta: number, size: number): void {
    const context = this.context;
    for (const particle of this.particles) {
      particle.life -= delta;
      if (particle.life <= 0) continue;
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      particle.velocityY += delta * (particle.dust ? 3 : 8);
      particle.velocityX *= Math.exp(-delta * (particle.dust ? 3 : 1.8));
      const x = particle.x * size;
      const y = particle.y * size;
      const radius = Math.max(0.4, Math.min(1.8, particle.size * size)) * IMPACT_SCALE;
      const age = particle.maximumLife - particle.life;
      context.globalAlpha =
        (particle.life / particle.maximumLife) ** 1.2 *
        (particle.dust ? 0.65 : particle.ember ? 0.32 : 0.95);
      context.fillStyle = particle.color;
      if (!particle.dust) {
        context.strokeStyle = particle.color;
        context.lineWidth = Math.max(0.65, radius * 0.65);
        context.beginPath();
        context.moveTo(
          x - particle.velocityX * size * 0.018,
          y - particle.velocityY * size * 0.018,
        );
        context.lineTo(x, y);
        context.stroke();
        if (age < 0.16 && !particle.ember) {
          const glowRadius = radius * 2.5;
          context.drawImage(
            this.glows.get(particle.color)!,
            x - glowRadius,
            y - glowRadius,
            glowRadius * 2,
            glowRadius * 2,
          );
        }
      }
      if (particle.shard) {
        context.save();
        context.translate(x, y);
        context.rotate(particle.life * 12);
        context.fillRect(-radius / 2, -radius / 2, radius, radius);
        context.restore();
      } else {
        context.beginPath();
        context.arc(x, y, radius * (particle.dust ? 0.85 : 0.95), 0, Math.PI * 2);
        context.fill();
      }
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    context.globalAlpha = 1;
  }

  dispose(): void {
    this.reset();
    this.canvas.remove();
    this.glows.clear();
  }
}
