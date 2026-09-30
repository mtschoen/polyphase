import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  starsFragmentShader,
  starsVertexShader,
} from './universe-shaders';

const palettes = [
  { primary: '#68f5cd', secondary: '#ff927e', void: '#02090e' },
  { primary: '#ffa86c', secondary: '#ee76aa', void: '#0c060d' },
  { primary: '#78b9ff', secondary: '#bf99fa', void: '#040811' },
].map((palette) => ({
  primary: new Color(palette.primary),
  secondary: new Color(palette.secondary),
  void: new Color(palette.void),
}));

type DisposableResource = { dispose(): void };
type OrbitalGeometry = {
  lines: LineSegments<EdgesGeometry, LineBasicMaterial>;
  horizontalPosition: number;
  rotationSpeed: number;
};

/** An atmospheric GPU backdrop. The game owns the animation loop. */
export class Universe {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private readonly resources: DisposableResource[] = [];
  private readonly orbitalGeometry: OrbitalGeometry[] = [];
  private readonly uniforms = {
    uTime: { value: 12 },
    uAspect: { value: 1 },
    uIntensity: { value: 0 },
    uBurst: { value: 0 },
    uPixelRatio: { value: 1 },
    uPrimary: { value: palettes[0].primary.clone() },
    uSecondary: { value: palettes[0].secondary.clone() },
    uVoid: { value: palettes[0].void.clone() },
  };
  private renderer: WebGLRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private themeIndex = 0;
  private motionSeconds = 12;
  private previousTimeSeconds: number | null = null;
  private burstAmount = 0;
  private reducedMotion = false;
  private contextLost = false;
  private disposed = false;
  private width = 0;
  private height = 0;
  private pixelRatio = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    try {
      this.renderer = new WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'default',
      });
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.setClearColor(palettes[0].void);
      this.camera.position.z = 10;
      this.createAtmosphere();
      this.createStars();
      this.createOrbitalGeometry();
      this.canvas.dataset.universeStatus = 'ready';
      this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
      window.addEventListener('resize', this.resize);
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(this.canvas);
      this.resize();
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.dispose();
      this.showFallback('unavailable');
      console.warn('POLYPHASE GPU atmosphere is unavailable; using the CSS background.', error);
    }
  }

  get available(): boolean {
    return this.renderer !== null && !this.contextLost && !this.disposed;
  }

  update(timeSeconds: number, deltaSeconds: number, intensity: number): void {
    if (!this.available) return;
    const elapsed = this.previousTimeSeconds === null ? 0 : timeSeconds - this.previousTimeSeconds;
    this.previousTimeSeconds = timeSeconds;
    const delta = MathUtils.clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : elapsed, 0, 0.1);
    if (!this.reducedMotion) this.motionSeconds += delta;
    this.burstAmount *= Math.exp(-delta * 2.6);
    this.uniforms.uTime.value = this.motionSeconds;
    this.uniforms.uBurst.value = this.reducedMotion ? 0 : this.burstAmount;
    const targetIntensity = this.reducedMotion ? 0 : MathUtils.clamp(intensity, 0, 1);
    this.uniforms.uIntensity.value = MathUtils.damp(
      this.uniforms.uIntensity.value,
      targetIntensity,
      2.2,
      delta,
    );
    const palette = palettes[this.themeIndex];
    const transition = 1 - Math.exp(-delta * 2.1);
    this.uniforms.uPrimary.value.lerp(palette.primary, transition);
    this.uniforms.uSecondary.value.lerp(palette.secondary, transition);
    this.uniforms.uVoid.value.lerp(palette.void, transition);
    for (const orbit of this.orbitalGeometry) {
      if (!this.reducedMotion) {
        orbit.lines.rotation.x += delta * orbit.rotationSpeed;
        orbit.lines.rotation.y += delta * orbit.rotationSpeed * 0.7;
        orbit.lines.rotation.z += delta * orbit.rotationSpeed * 0.2;
      }
      orbit.lines.material.color.copy(this.uniforms.uPrimary.value);
      orbit.lines.material.opacity = 0.05 + this.uniforms.uIntensity.value * 0.012;
    }
    this.resize();
    this.renderer!.render(this.scene, this.camera);
  }

  setTheme(index: number): void {
    const normalized = Number.isFinite(index) ? Math.trunc(index) : 0;
    this.themeIndex = ((normalized % palettes.length) + palettes.length) % palettes.length;
  }

  burst(strength: number): void {
    if (this.reducedMotion || this.disposed) return;
    this.burstAmount = MathUtils.clamp(
      this.burstAmount + MathUtils.clamp(strength, 0, 1.5) * 0.75,
      0,
      1,
    );
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
    if (reducedMotion) {
      this.burstAmount = 0;
      this.uniforms.uBurst.value = 0;
      this.uniforms.uIntensity.value = 0;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.releaseResources();
    this.renderer?.dispose();
    this.renderer = null;
    this.canvas.dataset.universeStatus = 'disposed';
  }

  private createAtmosphere(): void {
    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const atmosphere = new Mesh(geometry, material);
    atmosphere.frustumCulled = false;
    atmosphere.renderOrder = -10;
    this.resources.push(geometry, material);
    this.scene.add(atmosphere);
  }

  private createStars(): void {
    const count = 240;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const motes = new Float32Array(count);
    let seed = 418;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let index = 0; index < count; index++) {
      const mote = index >= 195 ? 1 : 0;
      positions[index * 3] = (random() - 0.5) * 5.5;
      positions[index * 3 + 1] = (random() - 0.5) * 2.3;
      positions[index * 3 + 2] = -random() * 3;
      sizes[index] = mote ? 3 + random() * 3.5 : 0.8 + random() * 1.7;
      phases[index] = random() * Math.PI * 2;
      motes[index] = mote;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
    geometry.setAttribute('aMote', new Float32BufferAttribute(motes, 1));
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: starsVertexShader,
      fragmentShader: starsFragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const stars = new Points(geometry, material);
    stars.frustumCulled = false;
    this.resources.push(geometry, material);
    this.scene.add(stars);
  }

  private createOrbitalGeometry(): void {
    const placements = [
      { horizontalPosition: -0.73, verticalPosition: 0.18, size: 0.18, speed: 0.027 },
      { horizontalPosition: 0.76, verticalPosition: -0.32, size: 0.24, speed: -0.021 },
    ];
    for (const placement of placements) {
      const solid = new IcosahedronGeometry(placement.size, 0);
      const geometry = new EdgesGeometry(solid);
      solid.dispose();
      const material = new LineBasicMaterial({
        color: this.uniforms.uPrimary.value,
        opacity: 0.05,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const lines = new LineSegments(geometry, material);
      lines.position.set(placement.horizontalPosition, placement.verticalPosition, -2);
      lines.rotation.set(0.4, 0.8, 0.3);
      this.orbitalGeometry.push({
        lines,
        horizontalPosition: placement.horizontalPosition,
        rotationSpeed: placement.speed,
      });
      this.resources.push(geometry, material);
      this.scene.add(lines);
    }
  }

  private readonly resize = (): void => {
    if (!this.available) return;
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (width === this.width && height === this.height && pixelRatio === this.pixelRatio) return;
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    const aspect = width / height;
    this.renderer!.setPixelRatio(pixelRatio);
    this.renderer!.setSize(width, height, false);
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    this.uniforms.uAspect.value = aspect;
    this.uniforms.uPixelRatio.value = pixelRatio;
    for (const orbit of this.orbitalGeometry) {
      orbit.lines.position.x = orbit.horizontalPosition * aspect;
    }
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.showFallback('context-lost');
  };

  private readonly handleContextRestored = (): void => {
    if (this.disposed) return;
    this.contextLost = false;
    this.canvas.style.display = '';
    this.canvas.dataset.universeStatus = 'ready';
    this.width = 0;
    this.resize();
  };

  private showFallback(reason: 'unavailable' | 'context-lost'): void {
    this.canvas.style.display = 'none';
    this.canvas.dataset.universeStatus = reason;
  }

  private releaseResources(): void {
    for (const resource of this.resources) resource.dispose();
    this.resources.length = 0;
    this.orbitalGeometry.length = 0;
    this.scene.clear();
  }
}
