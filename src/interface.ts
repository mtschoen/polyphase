import { PIECE_SIZES, PURE_MODES, THEMES, type GameStatus } from './game/types';
import { IMPACT_CONTROLS, IMPACT_PERCENT_RANGE } from './impact-settings';
import type { GameEngine } from './game/engine';

const icons = {
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2M12 16h.01"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  trophy:
    '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 2h8"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
};
export function icon(name: keyof typeof icons): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

export function createInterface(): void {
  document.querySelector('#app')!.innerHTML = `
    <canvas id="universe" aria-hidden="true"></canvas><div class="vignette"></div>
    <header class="site-header">
      <a class="wordmark" href="./" aria-label="Polyphase home"><span class="brand-shape"><i></i><i></i><i></i><i></i><i></i></span>POLYPHASE<span class="edition">VOL. 01</span></a>
      <div class="header-center"><span class="live-dot"></span> A FALLING-BLOCK ODYSSEY</div>
      <nav class="header-actions" aria-label="Game tools">
        <button id="leaderboard" class="icon-button" title="Leaderboard" aria-label="Leaderboard">${icon('trophy')}</button>
        <button id="mute" class="icon-button" title="Toggle sound (M)" aria-label="Mute sound" aria-pressed="false">${icon('sound')}</button>
        <button id="help" class="icon-button" title="How to play" aria-label="How to play">${icon('help')}</button>
        <button id="fullscreen" class="icon-button" title="Fullscreen (F)" aria-label="Toggle fullscreen">${icon('expand')}</button>
        <button id="settings" class="icon-button" title="Settings" aria-label="Settings">${icon('settings')}</button>
      </nav>
    </header>
    <main class="experience">
      <aside class="journey">
        <div class="mobile-setup"><label>Frequency<select id="mobile-mode" aria-label="Game mode">${PURE_MODES.map(({ mode, name }) => `<option value="${mode}" ${mode === 'pentris' ? 'selected' : ''}>${name}</option>`).join('')}<option value="fusion">Fusion</option></select></label><label>Pace<select id="mobile-difficulty" aria-label="Difficulty"><option value="flow">Flow</option><option value="rush">Rush</option></select></label></div>
        <div class="eyebrow"><span class="small-line"></span> ONE SQUARE. SIX DIMENSIONS.</div>
        <h1>Find your<br><em>flow state.</em></h1>
        <p class="intro-copy">A familiar rhythm.<br>A whole new dimension.</p>
        <div class="mode-heading">CHOOSE YOUR FREQUENCY <span>05 / 07</span></div>
        <div class="modes" role="group" aria-label="Game mode">
          ${PURE_MODES.map(({ mode, size, name, shapeCount }) => `<button class="mode ${mode === 'pentris' ? 'selected' : ''}" data-mode="${mode}" aria-pressed="${mode === 'pentris'}"><span class="mode-number">${size}<span>■</span></span><span><strong>${name}</strong><small>${shapeCount} ${shapeCount === 1 ? 'shape' : 'shapes'}</small></span></button>`).join('')}
          <button class="mode fusion-mode" data-mode="fusion" aria-pressed="false"><span class="mode-number fusion-symbol">∞</span><span><strong>Fusion</strong><small>Your pieces. Your rhythm.</small></span><span class="mode-check">↗</span></button>
        </div>
        <fieldset id="fusion-options" class="fusion-options" hidden><legend>MIX YOUR PIECE SIZES</legend><div class="fusion-sizes">${PIECE_SIZES.map((size) => `<label><input type="checkbox" data-fusion-size="${size}" aria-label="${size}-square pieces" ${size >= 5 ? 'checked' : ''}/><span>${size}</span></label>`).join('')}</div><p id="fusion-summary" aria-live="polite">5 + 6 squares</p></fieldset>
        <div class="pace-label">SET YOUR PACE</div>
        <div class="pace" role="group" aria-label="Difficulty"><button data-difficulty="flow" class="selected" aria-pressed="true">Flow <span>Take your time</span></button><button data-difficulty="rush" aria-pressed="false">Rush <span>Feel the pressure</span></button></div>
        <div class="journey-note"><span>✳</span><p>Build a little harmony.<br>Clear lines. Light up the universe.</p></div>
      </aside>
      <section class="game-section" aria-label="Game board">
        <div class="board-heading"><span id="board-title">05 <b>/</b> PENTRIS</span><span id="game-state"><i></i> STANDBY</span><button id="pause" class="icon-button" aria-label="Pause game" title="Pause (P)">${icon('pause')}<span id="pause-label">Pause</span></button></div>
        <div class="board-frame" id="board-frame"><div class="board-corner top-left"></div><div class="board-corner top-right"></div><canvas id="board" aria-label="Falling polyomino game board"></canvas><div id="overlay" class="board-overlay"></div><div class="board-corner bottom-left"></div><div class="board-corner bottom-right"></div><div id="callout" aria-live="polite"></div></div>
        <div class="board-foot"><span><i class="live-dot"></i> <span id="board-size">12 × 22 MATRIX</span></span><button id="effects-mode" aria-label="Use reduced effects" title="Toggle full or reduced effects">FULL FX</button><span id="run-time">00:00</span></div>
      </section>
      <aside class="telemetry">
        <div class="score-block"><div class="eyebrow">YOUR SCORE</div><div id="score">000000</div><div class="best">PERSONAL BEST <span id="best">0</span></div></div>
        <div class="run-stats"><div><span>LEVEL</span><strong id="level">01</strong></div><div><span>LINES</span><strong id="lines">00</strong></div></div>
        <div class="piece-panel hold-panel"><div class="panel-heading">HOLD <kbd>C</kbd></div><canvas id="held" width="160" height="64" aria-label="Held piece"></canvas><small id="hold-caption">A little breathing room</small></div>
        <div class="piece-panel next-panel"><div class="panel-heading">UP NEXT <span>→</span></div>${[0, 1, 2, 3].map((index) => `<div class="next-item"><span>0${index + 1}</span><canvas id="next-${index}" width="132" height="58" aria-label="Next piece ${index + 1}"></canvas></div>`).join('')}</div>
        <button id="resonance" class="resonance" title="Fill the meter, then press Enter to clear the bottom four rows"><span class="panel-heading"><span>✳ RESONANCE</span><kbd>↵</kbd></span><span class="charge-track"><span id="charge-fill"></span></span><span class="charge-caption"><span id="charge-label">FIND YOUR RHYTHM</span><span id="charge-percent">0%</span></span></button>
      </aside>
    </main>
    <div class="touch-controls" role="group" aria-label="Touch controls">
      <div class="direction-pad" role="group" aria-label="Movement and drop">
        <button data-action="drop" data-pad="direction" aria-label="Hard drop" disabled><span aria-hidden="true">↑</span><small>DROP</small></button>
        <button data-action="left" data-pad="direction" aria-label="Move left" disabled>←</button>
        <button data-action="right" data-pad="direction" aria-label="Move right" disabled>→</button>
        <button data-action="down" data-pad="direction" aria-label="Soft drop" disabled><span aria-hidden="true">↓</span><small>SOFT</small></button>
      </div>
      <div class="action-pad" role="group" aria-label="Rotation and hold">
        <button data-action="counter" aria-label="Rotate counterclockwise" disabled>↶</button>
        <button data-action="rotate" aria-label="Rotate clockwise" disabled>↷</button>
        <button data-action="hold" aria-label="Hold piece" disabled><span>HOLD</span><small id="touch-hold-caption">NEXT PIECE</small></button>
      </div>
    </div>
    <footer class="site-footer"><div class="now-playing"><div class="equalizer"><i></i><i></i><i></i><i></i><i></i></div><div><span>ORIGINAL SOUND EXPERIENCE</span><strong id="track-name">Eventide <b>·</b> 5/4</strong></div></div><div class="theme-picker" role="group" aria-label="Atmosphere">${THEMES.map((theme, index) => `<button data-theme="${index}" class="theme-dot ${index === 0 ? 'selected' : ''}" style="--swatch:${theme.primary}" aria-label="${theme.name} atmosphere" aria-pressed="${index === 0}"></button>`).join('')}<span id="theme-name">EVENTIDE</span></div><a class="source-link" href="https://github.com/mtschoen/polyphase" target="_blank" rel="noopener noreferrer" aria-label="View Polyphase on GitHub (opens in a new tab)">GitHub <span aria-hidden="true">&#8599;</span></a><div class="headphone-note">◉ <span>Better with headphones</span></div></footer>
    <div class="keyboard-strip"><span><kbd>←</kbd><kbd>→</kbd> move</span><span><kbd>↑</kbd> rotate</span><span><kbd>↓</kbd> soft drop</span><span><kbd class="wide-key">SPACE</kbd> hard drop</span><span><kbd>C</kbd> hold</span><span><kbd>P</kbd> pause</span></div>
    ${settingsDialog()}
    <dialog id="help-dialog"><div class="dialog-heading"><span class="eyebrow">A FAMILIAR RHYTHM, REMIXED</span><button data-close class="close-button" aria-label="Close help">×</button></div><h2>A few more squares.<br>A lot more possibility.</h2><p>Fit the falling shapes together. Fill a complete horizontal line to clear it. Keep the stack below the top.</p><p class="touch-help">Use the bottom pad to move left or right. Hold down for soft drop; tap up once for hard drop. The two arrows on the right rotate in opposite directions, with Hold below them. Lift your thumb before choosing another direction. Dimmed Hold becomes available with the next piece.</p><div class="help-grid"><span>Move</span><kbd>← → / A D</kbd><span>Rotate clockwise</span><kbd>↑ / X / E</kbd><span>Rotate counterclockwise</span><kbd>Z / Q</kbd><span>Soft / hard drop</span><kbd>↓ / SPACE</kbd><span>Hold a piece</span><kbd>C / SHIFT</kbd><span>Resonance</span><kbd>ENTER</kbd><span>Pause</span><kbd>P / ESC</kbd><span>Mute / fullscreen</span><kbd>M / F</kbd></div><p><strong>Make some space.</strong> Each placement and cleared line charges Resonance. At 100%, press Enter to sweep away the bottom four rows.</p><p class="dialog-bottom">Choose any pure size from one to six. Fusion lets you mix your own sizes with equal chances for each. Mirrored shapes are included, including all seven classic four-square pieces.</p></dialog>
    <div id="toast" role="status"></div>`;
  // Keep the mobile dock anchored to the viewport while the game surface shakes.
  document.body.append(document.querySelector('.site-footer')!);
  document.body.append(document.querySelector('.keyboard-strip')!);
  document.body.append(document.querySelector('.touch-controls')!);
}

export function updateControls(game: GameEngine): void {
  const playing = game.status === 'playing';
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.disabled = button.dataset.action === 'hold' ? !game.canHold : !playing;
  });
  document.querySelector('.hold-panel')!.classList.toggle('unavailable', !game.canHold);
  setText(
    '#hold-caption',
    game.canHold ? (game.held ? 'Hold to swap' : 'Ready to hold') : 'Hold unavailable',
  );
  setText('#touch-hold-caption', game.canHold ? 'READY' : 'UNAVAILABLE');
  const resonance = document.querySelector<HTMLButtonElement>('#resonance')!;
  resonance.disabled = !game.canResonate;
  resonance.classList.toggle('ready', game.canResonate);
  resonance.setAttribute(
    'aria-label',
    game.canResonate ? 'Activate Resonance' : `Resonance charging: ${Math.floor(game.charge)}%`,
  );
  setText(
    '#charge-label',
    game.canResonate ? 'ACTIVATE' : game.charge >= 100 ? 'CHARGED' : 'CHARGING',
  );
}

function settingsDialog(): string {
  return `<dialog id="settings-dialog">
    <div class="dialog-heading"><span class="eyebrow">MAKE IT YOURS</span><button data-close class="close-button" aria-label="Close settings">×</button></div>
    <h2>Your atmosphere.</h2>
    <label class="setting-row" for="volume">Master volume <output id="volume-value">60%</output></label>
    <input type="range" id="volume" min="0" max="100" value="60"/>
    <fieldset class="impact-controls" id="impact-controls"><legend>MORE JUICE</legend>
      ${IMPACT_CONTROLS.map(({ key, label }) => {
        const { minimum, maximum, step } = IMPACT_PERCENT_RANGE;
        return `<div class="setting-row"><label for="impact-${key}">${label}</label><output id="impact-${key}-value" for="impact-${key}">100%</output></div>
          <input type="range" id="impact-${key}" min="${minimum}" max="${maximum}" step="${step}" value="100" aria-describedby="impact-hint"/>`;
      }).join('')}
      <button id="reset-impacts" class="text-button" type="button">Reset juice</button>
    </fieldset>
    <p class="setting-hint" id="impact-hint">Tune the sparks and shake for landings and line clears.</p>
    <label class="setting-toggle">Reduced motion <input type="checkbox" id="reduced-motion"/></label>
    <p class="setting-hint">Turns off particles and shake while keeping your juice settings.</p>
    <label class="setting-toggle">Spoken clear callouts <input type="checkbox" id="announcer" checked/></label>
    <p class="setting-hint">Optional announcer, when a voice is available in your browser.</p>
    <label class="setting-toggle">Landing guide <input type="checkbox" id="ghost" checked/></label>
    <p class="setting-hint">See exactly where your next piece will land.</p>
    <p class="dialog-bottom">Your settings and personal bests stay on this device.</p>
  </dialog>`;
}

export function renderOverlay(status: GameStatus, score: number): void {
  const overlay = document.querySelector<HTMLElement>('#overlay')!;
  overlay.hidden = status === 'playing';
  if (status === 'playing') return;
  const ready = status === 'ready';
  const paused = status === 'paused';
  overlay.replaceChildren();
  const content = append(overlay, 'div', 'overlay-content');
  const orbit = append(content, 'div', 'orbital-icon');
  append(orbit, 'span');
  append(orbit, 'i', '', '✳');
  append(
    content,
    'span',
    'eyebrow',
    ready ? 'MORE SHAPE. MORE FEELING.' : paused ? 'TAKE A BREATH' : 'EVERY END IS A BEGINNING',
  );
  const heading = append(content, 'h2', '', ready ? 'One more' : paused ? 'Stay in' : 'Beautiful');
  append(heading, 'br');
  append(heading, 'em', '', ready ? 'dimension.' : paused ? 'your orbit.' : 'experiment.');
  append(
    content,
    'p',
    '',
    ready
      ? 'Let the world fall into place.'
      : paused
        ? 'Your universe will be here.'
        : `${score.toLocaleString()} points. Find your flow again.`,
  );
  const start = append(
    content,
    'button',
    'start-button',
    ready ? 'Enter the flow' : paused ? 'Keep flowing' : 'One more journey',
  );
  start.dataset.overlayAction = paused ? 'resume' : 'start';
  const arrow = append(start, 'span', '', '→');
  arrow.setAttribute('aria-hidden', 'true');
  if (ready) append(content, 'small', 'start-hint', 'PRESS SPACE TO BEGIN');
  else
    append(content, 'button', 'text-button', 'Back to frequencies').dataset.overlayAction = 'menu';
  if (status === 'over')
    append(content, 'button', 'text-button', 'View leaderboard').dataset.overlayAction =
      'leaderboard';
}

function append<Tag extends keyof HTMLElementTagNameMap>(
  parent: HTMLElement,
  tag: Tag,
  className = '',
  text = '',
): HTMLElementTagNameMap[Tag] {
  const child = document.createElement(tag);
  child.className = className;
  child.textContent = text;
  parent.append(child);
  return child;
}

export function setText(selector: string, text: string): void {
  const element = document.querySelector(selector)!;
  if (element.textContent !== text) element.textContent = text;
}
