import { CLEAR_TIERS } from './clear-tiers';
import {
  DEFAULT_IMPACT_SETTINGS,
  IMPACT_CONTROLS,
  IMPACT_PERCENT_RANGE,
  impactPercent,
  impactValue,
  type ImpactSettings,
} from './impact-settings';

interface JuiceLabCallbacks {
  onOpen(): void;
  onImpactChange(key: keyof ImpactSettings, value: number): void;
  onReset(): void;
  onPreview(kind: 'landing' | 'clear', lines: number): void;
}

const UNLOCK_CODES = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];

export class JuiceLab {
  private panel = document.createElement('aside');
  private recentCodes: string[] = [];
  private previousFocus: HTMLElement | null = null;

  constructor(private callbacks: JuiceLabCallbacks) {
    this.panel.id = 'juice-lab';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-labelledby', 'juice-lab-title');
    this.panel.innerHTML = `
      <div class="juice-lab-heading"><div><span>SECRET FREQUENCY</span><h2 id="juice-lab-title">Juice lab</h2></div>
        <button type="button" class="juice-lab-close" aria-label="Close juice lab">&times;</button></div>
      <p class="juice-lab-intro">Dial it in. Light it up.</p>
      <fieldset class="juice-lab-controls"><legend>YOUR MIX</legend>
        ${IMPACT_CONTROLS.map(({ key, label }) => {
          const { minimum, maximum, step } = IMPACT_PERCENT_RANGE;
          return `<div class="juice-lab-setting"><label for="lab-${key}">${label}</label><output for="lab-${key}" id="lab-${key}-value">100%</output></div>
            <input id="lab-${key}" data-impact="${key}" type="range" min="${minimum}" max="${maximum}" step="${step}" value="100" aria-describedby="juice-lab-hint"/>`;
        }).join('')}
        <button type="button" class="juice-lab-reset">Reset juice</button>
      </fieldset>
      <p id="juice-lab-hint" class="juice-lab-hint"></p>
      <div class="juice-lab-preview"><label for="preview-clear">TEST YOUR MIX</label>
        <select id="preview-clear">${CLEAR_TIERS.map((tier) => `<option value="${tier.lines}">${tier.lines} ${tier.lines === 1 ? 'line' : 'lines'}: ${tier.label}</option>`).join('')}</select>
        <div class="juice-lab-actions"><button type="button" id="preview-effects">Try explosion</button><button type="button" id="preview-landing">Try landing</button></div>
        <p>Your score and board stay the same.</p>
      </div>`;
    document.body.append(this.panel);
    this.panel.addEventListener('input', this.changeImpact);
    this.panel.addEventListener('click', this.click);
    this.panel.addEventListener('keydown', this.stopPanelKeys);
    this.panel.addEventListener('keyup', this.stopPanelKeys);
    window.addEventListener('keydown', this.detectUnlock, true);
    this.setSettings(DEFAULT_IMPACT_SETTINGS, false);
  }

  setSettings(settings: ImpactSettings, reducedMotion: boolean): void {
    for (const { key } of IMPACT_CONTROLS) {
      const slider = this.panel.querySelector<HTMLInputElement>(`#lab-${key}`)!;
      const percent = impactPercent(key, settings[key]);
      slider.value = String(percent);
      slider.disabled = reducedMotion;
      this.panel.querySelector<HTMLOutputElement>(`#lab-${key}-value`)!.value = `${percent}%`;
    }
    this.panel.querySelector<HTMLElement>('#juice-lab-hint')!.textContent = reducedMotion
      ? 'Reduced motion is on. Turn it off in Settings to adjust the juice.'
      : 'Tune the sparks and shake. 100% is the default mix.';
  }

  private detectUnlock = (event: KeyboardEvent): void => {
    if (!this.panel.hidden && event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
      return;
    }
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])')
    ) {
      this.recentCodes = [];
      return;
    }
    if (
      event.repeat ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing
    )
      return;
    this.recentCodes.push(event.code);
    this.recentCodes = this.recentCodes.slice(-UNLOCK_CODES.length);
    if (!UNLOCK_CODES.every((code, index) => this.recentCodes[index] === code)) return;
    this.recentCodes = [];
    event.preventDefault();
    event.stopImmediatePropagation();
    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.callbacks.onOpen();
    this.panel.hidden = false;
    this.panel.querySelector<HTMLButtonElement>('.juice-lab-close')!.focus();
  };

  private stopPanelKeys = (event: KeyboardEvent): void => {
    event.stopPropagation();
  };

  private changeImpact = (event: Event): void => {
    const slider = event.target;
    if (!(slider instanceof HTMLInputElement) || slider.disabled) return;
    const key = IMPACT_CONTROLS.find((control) => control.key === slider.dataset.impact)?.key;
    if (!key) return;
    const percent = Number(slider.value);
    this.panel.querySelector<HTMLOutputElement>(`#lab-${key}-value`)!.value = `${percent}%`;
    this.callbacks.onImpactChange(key, impactValue(key, percent));
  };

  private click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button) return;
    if (button.classList.contains('juice-lab-close')) this.close();
    else if (button.classList.contains('juice-lab-reset')) this.callbacks.onReset();
    else if (button.id === 'preview-effects' || button.id === 'preview-landing') {
      const lines = Number(this.panel.querySelector<HTMLSelectElement>('#preview-clear')!.value);
      this.callbacks.onPreview(button.id === 'preview-landing' ? 'landing' : 'clear', lines);
    }
  };

  private close(): void {
    this.panel.hidden = true;
    this.recentCodes = [];
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    this.previousFocus = null;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.detectUnlock, true);
    this.panel.removeEventListener('input', this.changeImpact);
    this.panel.removeEventListener('click', this.click);
    this.panel.removeEventListener('keydown', this.stopPanelKeys);
    this.panel.removeEventListener('keyup', this.stopPanelKeys);
    this.panel.remove();
    this.recentCodes = [];
    this.previousFocus = null;
  }
}
