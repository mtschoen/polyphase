import { getClearTier } from './clear-tiers';

const unitInterval = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Optional native speech. Musical clear effects never depend on voice availability. */
export class Announcer {
  private enabled = false;
  private muted = false;
  private volume = 0.65;
  private disposed = false;
  private synthesis = typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.cancel();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancel();
  }

  setVolume(volume: number): void {
    const nextVolume = unitInterval(volume);
    if (this.volume !== nextVolume) this.cancel();
    this.volume = nextVolume;
  }

  announce(lines: number): void {
    if (
      this.disposed ||
      !this.enabled ||
      this.muted ||
      this.volume === 0 ||
      !this.synthesis ||
      typeof SpeechSynthesisUtterance === 'undefined'
    )
      return;
    // Browsers may populate voices asynchronously. Query at each clear instead of caching emptiness.
    const voices = this.synthesis.getVoices();
    const english = voices.filter((voice) => /^en(?:-|$)/i.test(voice.lang));
    const voice =
      english.find((candidate) => candidate.default) ??
      english.find((candidate) => candidate.localService) ??
      english[0];
    if (!voice) return;
    const tier = getClearTier(lines);
    const utterance = new SpeechSynthesisUtterance(tier.label);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.volume = this.volume;
    utterance.rate = 1.12;
    utterance.pitch = 0.9;
    this.cancel();
    this.synthesis.speak(utterance);
  }

  cancel(): void {
    this.synthesis?.cancel();
  }

  dispose(): void {
    if (this.disposed) return;
    this.cancel();
    this.disposed = true;
  }
}
