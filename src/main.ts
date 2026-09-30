import './style.css';
import { GameEngine } from './game/engine';
import {
  PIECE_SIZES,
  PURE_MODES,
  THEMES,
  type Mode,
  type Difficulty,
  type GameStatus,
} from './game/types';
import { AudioEngine, soundtrackForSizes } from './audio';
import { Universe } from './universe';
import { BoardRenderer, drawPreview } from './renderer';
import { createInterface, renderOverlay, setText } from './interface';
import { InputController } from './input';
import { loadSettings, saveSettings, readBest, saveBest } from './storage';
import { Announcer } from './announcer';
import { GameFeedback } from './feedback';
import { JuiceLab } from './juice-lab';
import { LeaderboardPanel } from './leaderboard-panel';
import {
  DEFAULT_IMPACT_SETTINGS,
  IMPACT_CONTROLS,
  impactPercent,
  impactValue,
} from './impact-settings';

createInterface();
const element = <T extends Element = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
let mode: Mode = 'pentris';
let difficulty: Difficulty = 'flow';
const settings = loadSettings();
let game = new GameEngine(mode, difficulty, Math.random, settings.fusionSizes);
const audio = new AudioEngine();
const universe = new Universe(element<HTMLCanvasElement>('#universe'));
const renderer = new BoardRenderer(element<HTMLCanvasElement>('#board'), element('#board-frame'));
const announcer = new Announcer();
const feedback = new GameFeedback(renderer, universe, audio, announcer);
let previousStatus: GameStatus | undefined;
let previousPreviews = '';
let best = readBest(game.recordKey, difficulty);
let toastTimer = 0;
let starting = false;
let savedScore = -1;
const runSession = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
let runNumber = 0;

function toast(message: string): void {
  setText('#toast', message);
  element('#toast').classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element('#toast').classList.remove('visible'), 3500);
}
function persistSettings(): void {
  if (!saveSettings(settings)) toast('Settings could not be saved on this device.');
}
function applySettings(): void {
  audio.setVolume(settings.volume);
  audio.setMuted(settings.muted);
  audio.setTheme(settings.theme);
  announcer.setEnabled(settings.announcer);
  announcer.setMuted(settings.muted);
  announcer.setVolume(settings.volume);
  universe.setTheme(settings.theme);
  universe.setReducedMotion(settings.reducedMotion);
  renderer.reducedMotion = settings.reducedMotion;
  renderer.showGhost = settings.ghost;
  applyImpactSettings();
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  document.body.classList.toggle('playing', game.status === 'playing' && !settings.muted);
  document.documentElement.style.setProperty('--accent', THEMES[settings.theme].primary);
  element('#mute').setAttribute('aria-pressed', String(settings.muted));
  element('#mute').setAttribute('aria-label', settings.muted ? 'Unmute sound' : 'Mute sound');
  element<HTMLInputElement>('#volume').value = String(Math.round(settings.volume * 100));
  element<HTMLInputElement>('#reduced-motion').checked = settings.reducedMotion;
  element<HTMLInputElement>('#announcer').checked = settings.announcer;
  setText('#effects-mode', settings.reducedMotion ? 'CALM FX' : 'FULL FX');
  element('#effects-mode').setAttribute(
    'aria-label',
    settings.reducedMotion ? 'Enable full effects' : 'Use reduced effects',
  );
  element<HTMLInputElement>('#ghost').checked = settings.ghost;
  setText('#volume-value', `${Math.round(settings.volume * 100)}%`);
  updateTrack();
  setText('#theme-name', THEMES[settings.theme].name.toUpperCase());
  document.querySelectorAll<HTMLElement>('[data-theme]').forEach((button) => {
    const selected = Number(button.dataset.theme) === settings.theme;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
function applyImpactSettings(): void {
  renderer.setImpactSettings(settings);
  juiceLab.setSettings(settings, settings.reducedMotion);
  for (const { key } of IMPACT_CONTROLS) {
    const value = impactPercent(key, settings[key]);
    element<HTMLInputElement>(`#impact-${key}`).value = String(value);
    setText(`#impact-${key}-value`, `${value}%`);
  }
  element<HTMLFieldSetElement>('#impact-controls').disabled = settings.reducedMotion;
  setText(
    '#impact-hint',
    settings.reducedMotion
      ? 'Reduced motion is on. Turn it off to preview your sparks and shake.'
      : 'Tune the sparks and shake for landings and line clears.',
  );
}
function updateTrack(): void {
  const track = soundtrackForSizes(game.pieceSizes);
  setText('#track-name', `${THEMES[settings.theme].name} · ${track.meter}`);
  element('#track-name').setAttribute('title', `${track.title} · ${track.tempo}`);
}
function syncFusionOptions(): void {
  element<HTMLElement>('#fusion-options').hidden = mode !== 'fusion';
  document.querySelectorAll<HTMLInputElement>('[data-fusion-size]').forEach((checkbox) => {
    checkbox.checked = settings.fusionSizes.includes(
      Number(checkbox.dataset.fusionSize) as (typeof PIECE_SIZES)[number],
    );
  });
  setText('#fusion-summary', `${settings.fusionSizes.join(' + ')} squares · balanced mix`);
}
function mute(): void {
  settings.muted = !settings.muted;
  applySettings();
  persistSettings();
}
async function fullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    toast('Fullscreen is not available in this browser.');
  }
}
async function start(): Promise<void> {
  if (starting) return;
  saveCompletedRun();
  starting = true;
  try {
    await audio.start();
  } catch {
    toast('Audio is unavailable. You can still enjoy the game.');
  }
  game.start();
  runNumber++;
  feedback.reset();
  renderer.reset();
  input.clear();
  savedScore = -1;
  starting = false;
  if (document.hidden || document.querySelector('dialog[open]')) game.setPaused(true);
  syncStatus();
  if (window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) window.scrollTo(0, 0);
}
function pause(): void {
  if (game.status !== 'playing' && game.status !== 'paused') return;
  input.clear();
  game.setPaused(game.status === 'playing');
  if (game.status === 'playing') void audio.start().catch(() => toast('Audio could not resume.'));
  syncStatus();
}
function menu(): void {
  saveCompletedRun();
  input.clear();
  feedback.reset();
  game = new GameEngine(mode, difficulty, Math.random, settings.fusionSizes);
  audio.setMode(mode);
  audio.setPieceSizes(game.pieceSizes);
  updateTrack();
  renderer.reset();
  previousPreviews = '';
  best = readBest(game.recordKey, difficulty);
  document.documentElement.style.setProperty('--board-ratio', String(game.width / game.height));
  setText('#board-size', `${game.width} × ${game.height} MATRIX`);
  requestAnimationFrame(() => renderer.resize());
  syncStatus();
}
const input = new InputController({
  move: (direction) => game.move(direction),
  softDrop: (value) => {
    game.softDrop = value;
  },
  rotate: (direction) => game.rotate(direction),
  drop: () => game.hardDrop(),
  hold: () => game.hold(),
  resonate: () => resonate(),
  pause,
  mute,
  fullscreen: () => void fullscreen(),
  start: () => void start(),
  isPlaying: () => game.status === 'playing',
  isReady: () => game.status === 'ready' || game.status === 'over',
});
const juiceLab = new JuiceLab({
  onOpen: () => {
    if (game.status === 'playing') pause();
    input.clear();
    document
      .querySelectorAll<HTMLDialogElement>('dialog[open]')
      .forEach((dialog) => dialog.close());
  },
  onImpactChange: (key, value) => {
    settings[key] = value;
    applyImpactSettings();
    persistSettings();
  },
  onReset: resetImpacts,
  onPreview: (kind, lines) => void previewImpact(kind === 'landing', lines),
});
const leaderboard = new LeaderboardPanel({
  onOpen: () => {
    if (game.status === 'playing') pause();
    input.clear();
  },
  onStorageError: () =>
    toast('Scores are available for this session; this browser could not save them.'),
});
function openLeaderboard(): void {
  leaderboard.open(game.recordKey, game.difficulty);
}
function resonate(): void {
  if (game.status !== 'playing') return;
  if (game.charge < 100) {
    toast('Keep placing pieces and clearing lines to charge Resonance.');
    return;
  }
  game.activateResonance();
}
function syncStatus(): void {
  if (previousStatus === game.status) return;
  previousStatus = game.status;
  renderOverlay(game.status, game.score);
  audio.setPlaying(game.status === 'playing');
  if (game.status !== 'playing') announcer.cancel();
  document.body.classList.toggle('playing', game.status === 'playing' && !settings.muted);
  setText(
    '#game-state',
    { ready: '● STANDBY', playing: '● IN THE FLOW', paused: '● PAUSED', over: '● JOURNEY ENDED' }[
      game.status
    ],
  );
  const inRun = game.status === 'playing' || game.status === 'paused';
  document.body.classList.toggle('in-run', game.status !== 'ready');
  document
    .querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      '[data-mode], [data-difficulty], [data-fusion-size]',
    )
    .forEach((button) => {
      button.disabled = inRun;
    });
  element<HTMLButtonElement>('#pause').disabled = !inRun;
  element('#pause').setAttribute(
    'aria-label',
    game.status === 'paused' ? 'Resume game' : 'Pause game',
  );
  saveCompletedRun();
}
function saveCompletedRun(): void {
  if (game.status === 'over' && savedScore !== game.score) {
    leaderboard.recordRun({
      id: `${runSession}-${runNumber}`,
      recordKey: game.recordKey,
      difficulty: game.difficulty,
      score: game.score,
      lines: game.lines,
      level: game.level,
      duration: game.elapsed,
    });
    if (game.score > best) {
      best = game.score;
      if (!saveBest(game.recordKey, game.difficulty, best))
        toast('New personal best! This browser could not save it.');
      else toast('A new personal best. Beautifully played.');
    }
    savedScore = game.score;
  }
}
function updatePreviews(): void {
  const signature = `${game.held?.id}:${game.queue
    .slice(0, 4)
    .map((piece) => piece.id)
    .join(',')}`;
  if (signature === previousPreviews) return;
  previousPreviews = signature;
  drawPreview(element<HTMLCanvasElement>('#held'), game.held);
  for (let index = 0; index < 4; index++)
    drawPreview(element<HTMLCanvasElement>(`#next-${index}`), game.queue[index] || null);
  setText('#hold-caption', game.held ? 'Press C to swap' : 'A little breathing room');
}
function changeMode(next: Mode): void {
  if (game.status === 'playing' || game.status === 'paused') return;
  mode = next;
  document.querySelectorAll<HTMLElement>('[data-mode]').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const number = String(
    mode === 'fusion' ? 7 : PURE_MODES.find((entry) => entry.mode === mode)!.size,
  ).padStart(2, '0');
  setText('#board-title', `${number} / ${mode.toUpperCase()}`);
  setText('.mode-heading span', `${number} / 07`);
  syncFusionOptions();
  menu();
}

document.querySelectorAll<HTMLInputElement>('[data-fusion-size]').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    if (game.status === 'playing' || game.status === 'paused') return;
    const selected = PIECE_SIZES.filter(
      (size) => element<HTMLInputElement>(`[data-fusion-size="${size}"]`).checked,
    );
    if (!selected.length) {
      checkbox.checked = true;
      toast('Keep at least one piece size in your mix.');
      return;
    }
    settings.fusionSizes = [...selected];
    syncFusionOptions();
    persistSettings();
    menu();
  });
});
element('#overlay').addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-overlay-action]');
  if (button?.dataset.overlayAction === 'start') void start();
  if (button?.dataset.overlayAction === 'resume') pause();
  if (button?.dataset.overlayAction === 'menu') menu();
  if (button?.dataset.overlayAction === 'leaderboard') openLeaderboard();
});
document
  .querySelectorAll<HTMLElement>('[data-mode]')
  .forEach((button) =>
    button.addEventListener('click', () => changeMode(button.dataset.mode as Mode)),
  );
document.querySelectorAll<HTMLElement>('[data-difficulty]').forEach((button) =>
  button.addEventListener('click', () => {
    if (game.status === 'playing' || game.status === 'paused') return;
    difficulty = button.dataset.difficulty as Difficulty;
    document.querySelectorAll<HTMLElement>('[data-difficulty]').forEach((item) => {
      item.classList.toggle('selected', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    menu();
  }),
);
element('#mute').addEventListener('click', mute);
element('#leaderboard').addEventListener('click', openLeaderboard);
element('#fullscreen').addEventListener('click', () => void fullscreen());
element('#pause').addEventListener('click', pause);
element('#resonance').addEventListener('click', resonate);
for (const name of ['settings', 'help']) {
  const dialog = element<HTMLDialogElement>(`#${name}-dialog`);
  element(`#${name}`).addEventListener('click', () => {
    if (game.status === 'playing') pause();
    input.clear();
    dialog.showModal();
  });
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        dialog.close();
    }
  });
}
element('#volume').addEventListener('input', () => {
  settings.volume = Number(element<HTMLInputElement>('#volume').value) / 100;
  applySettings();
  persistSettings();
});
for (const { key } of IMPACT_CONTROLS) {
  element(`#impact-${key}`).addEventListener('input', () => {
    settings[key] = impactValue(key, Number(element<HTMLInputElement>(`#impact-${key}`).value));
    applyImpactSettings();
    persistSettings();
  });
}
function resetImpacts(): void {
  Object.assign(settings, DEFAULT_IMPACT_SETTINGS);
  applyImpactSettings();
  persistSettings();
}
element('#reset-impacts').addEventListener('click', resetImpacts);
element('#reduced-motion').addEventListener('change', () => {
  settings.reducedMotion = element<HTMLInputElement>('#reduced-motion').checked;
  applySettings();
  persistSettings();
});
element('#effects-mode').addEventListener('click', () => {
  settings.reducedMotion = !settings.reducedMotion;
  applySettings();
  persistSettings();
});
element('#announcer').addEventListener('change', () => {
  settings.announcer = element<HTMLInputElement>('#announcer').checked;
  applySettings();
  persistSettings();
});
async function previewImpact(landing: boolean, lines: number): Promise<void> {
  if (game.status === 'playing') pause();
  input.clear();
  try {
    await audio.start();
  } catch {
    toast('Audio is unavailable; showing the visual preview.');
  }
  renderer.reset();
  feedback.reset();
  if (landing) feedback.previewLanding(game.width, game.height, performance.now());
  else feedback.preview(lines, game.width, game.height, performance.now());
}
element('#ghost').addEventListener('change', () => {
  settings.ghost = element<HTMLInputElement>('#ghost').checked;
  applySettings();
  persistSettings();
});
document.querySelectorAll<HTMLElement>('[data-theme]').forEach((button) =>
  button.addEventListener('click', () => {
    settings.theme = Number(button.dataset.theme);
    applySettings();
    persistSettings();
  }),
);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.status === 'playing') pause();
});
window.addEventListener('blur', () => {
  if (game.status === 'playing') pause();
});
window.addEventListener('resize', () => {
  previousPreviews = '';
});
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  audio.dispose();
  universe.dispose();
  renderer.dispose();
  announcer.dispose();
  juiceLab.dispose();
  input.dispose();
  leaderboard.dispose();
});
applySettings();
syncFusionOptions();
syncStatus();
let previousTime = performance.now();
function frame(now: number): void {
  const delta = Math.max(0, Math.min((now - previousTime) / 1000, 0.1));
  previousTime = now;
  input.update(delta);
  game.update(delta);
  const intensity = Math.min(1, (game.level - 1) * 0.1 + game.charge * 0.003 + game.combo * 0.05);
  feedback.handle(game.drainEvents(), game.width, now, game.status === 'playing');
  audio.setIntensity(intensity);
  universe.update(now / 1000, delta, game.status === 'playing' ? intensity : 0);
  renderer.render(game, delta, now / 1000);
  syncStatus();
  updatePreviews();
  setText('#score', String(game.score).padStart(6, '0'));
  setText('#best', best.toLocaleString());
  setText('#level', String(game.level).padStart(2, '0'));
  setText('#lines', String(game.lines).padStart(2, '0'));
  setText(
    '#run-time',
    `${String(Math.floor(game.elapsed / 60)).padStart(2, '0')}:${String(Math.floor(game.elapsed % 60)).padStart(2, '0')}`,
  );
  element('#charge-fill').style.width = `${game.charge}%`;
  setText('#charge-percent', `${Math.floor(game.charge)}%`);
  setText('#charge-label', game.charge >= 100 ? 'READY. PRESS ENTER.' : 'FIND YOUR RHYTHM');
  element('#resonance').classList.toggle('ready', game.charge >= 100);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
