import { PURE_MODES, type Difficulty } from './game/types';
import {
  addLeaderboardEntry,
  boardEntries,
  isLeaderboardKey,
  leaderboardLabel,
  loadLeaderboard,
  mergeLeaderboardData,
  normalizePlayerName,
  saveLeaderboard,
  type LeaderboardData,
  type LeaderboardRun,
  type LeaderboardStorage,
} from './leaderboard';

interface LeaderboardCallbacks {
  onOpen(): void;
  onStorageError(): void;
}

export class LeaderboardPanel {
  private dialog = document.createElement('dialog');
  private data: LeaderboardData;
  private storageError: boolean;
  private recordKey = 'pentris';
  private difficulty: Difficulty = 'flow';
  private disposed = false;
  private errorReported = false;
  private runSerial = 0;

  constructor(
    private callbacks: LeaderboardCallbacks,
    private storage?: LeaderboardStorage,
  ) {
    const loaded = loadLeaderboard(storage);
    this.data = loaded.data;
    this.storageError = loaded.error;
    this.dialog.id = 'leaderboard-dialog';
    this.dialog.setAttribute('aria-labelledby', 'leaderboard-title');
    this.dialog.innerHTML = `
      <div class="dialog-heading"><span class="leaderboard-device">On this device</span>
        <button type="button" class="close-button" aria-label="Close leaderboard">&times;</button></div>
      <h2 id="leaderboard-title">Leaderboard</h2>
      <p class="leaderboard-intro">Your best ten runs for every shape and pace.</p>
      <div class="leaderboard-player"><label for="leaderboard-name">Player name</label>
        <input id="leaderboard-name" type="text" maxlength="16" autocomplete="nickname" spellcheck="false" aria-describedby="leaderboard-name-hint"/></div>
      <p id="leaderboard-name-hint">Used when a run ends. Saved scores keep their original names.</p>
      <div class="leaderboard-filters">
        <div><label for="leaderboard-board">Shapes</label><select id="leaderboard-board"></select></div>
        <div><label for="leaderboard-pace">Pace</label><select id="leaderboard-pace"><option value="flow">Flow</option><option value="rush">Rush</option></select></div>
      </div>
      <p class="leaderboard-error" role="status" hidden>Device storage could not be read or saved. Rankings are available for this session.</p>
      <div class="leaderboard-table-wrap"><table>
        <caption id="leaderboard-caption"></caption>
        <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Score</th><th scope="col">Lines</th><th scope="col">Level</th></tr></thead>
        <tbody id="leaderboard-entries"></tbody>
      </table></div>
      <p class="leaderboard-empty">No completed runs yet. Your next game starts the list.</p>
      <p class="dialog-bottom">Local rankings stay in this browser. Clearing site data removes them.</p>`;
    document.body.append(this.dialog);
    this.nameInput.value = this.data.playerName;
    this.dialog.addEventListener('click', this.click);
    this.dialog.addEventListener('input', this.changeName);
    this.dialog.addEventListener('change', this.changeFilter);
    this.dialog.addEventListener('close', this.closed);
    this.render();
  }

  open(recordKey: string, difficulty: Difficulty): void {
    if (this.disposed) return;
    this.refresh();
    this.nameInput.value = this.data.playerName;
    this.recordKey = isLeaderboardKey(recordKey) ? recordKey : 'pentris';
    this.difficulty = difficulty === 'rush' ? 'rush' : 'flow';
    this.callbacks.onOpen();
    this.render();
    this.reportStorageError();
    if (!this.dialog.open) this.dialog.showModal();
  }

  recordRun(run: LeaderboardRun): void {
    if (this.disposed) return;
    this.refresh();
    const next = addLeaderboardEntry(this.data, {
      ...run,
      id:
        run.id ??
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${this.runSerial++}`,
      completedAt: run.completedAt ?? Date.now(),
      name: this.data.playerName,
    });
    if (next === this.data) return;
    this.data = next;
    this.persist();
    if (this.dialog.open) this.render();
  }

  private get nameInput(): HTMLInputElement {
    return this.dialog.querySelector<HTMLInputElement>('#leaderboard-name')!;
  }

  private persist(): void {
    this.refresh(true);
    const readError = this.storageError;
    this.storageError = !saveLeaderboard(this.data, this.storage) || readError;
    this.reportStorageError();
  }

  private refresh(preservePlayerName = false): void {
    const previousError = this.storageError;
    const latest = loadLeaderboard(this.storage);
    this.data = mergeLeaderboardData(
      this.data,
      latest.data,
      preservePlayerName || previousError || latest.error,
    );
    this.storageError = latest.error;
  }

  private reportStorageError(): void {
    this.dialog.querySelector<HTMLElement>('.leaderboard-error')!.hidden = !this.storageError;
    if (this.storageError && !this.errorReported) this.callbacks.onStorageError();
    this.errorReported = this.storageError;
  }

  private changeName = (event: Event): void => {
    if (event.target !== this.nameInput) return;
    this.data = { ...this.data, playerName: normalizePlayerName(this.nameInput.value) };
    this.persist();
  };

  private changeFilter = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id === 'leaderboard-board') this.recordKey = target.value;
    else if (target.id === 'leaderboard-pace') this.difficulty = target.value as Difficulty;
    else return;
    this.render();
  };

  private click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('.close-button')) this.dialog.close();
    else if (event.target === this.dialog) {
      const bounds = this.dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        this.dialog.close();
    }
  };

  private closed = (): void => {
    this.nameInput.value = this.data.playerName;
  };

  private render(): void {
    const boards = new Set<string>([
      ...PURE_MODES.map(({ mode }) => mode),
      'fusion',
      this.recordKey,
    ]);
    for (const entry of this.data.entries) boards.add(entry.recordKey);
    const selector = this.dialog.querySelector<HTMLSelectElement>('#leaderboard-board')!;
    selector.replaceChildren(
      ...[...boards].map((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = leaderboardLabel(key);
        return option;
      }),
    );
    selector.value = this.recordKey;
    this.dialog.querySelector<HTMLSelectElement>('#leaderboard-pace')!.value = this.difficulty;
    const entries = boardEntries(this.data, this.recordKey, this.difficulty);
    this.dialog.querySelector<HTMLElement>('#leaderboard-caption')!.textContent =
      `${leaderboardLabel(this.recordKey)} · ${this.difficulty === 'flow' ? 'Flow' : 'Rush'}`;
    const body = this.dialog.querySelector<HTMLTableSectionElement>('#leaderboard-entries')!;
    body.replaceChildren(
      ...entries.map((entry, index) => {
        const row = document.createElement('tr');
        for (const text of [
          String(index + 1),
          entry.name,
          entry.score.toLocaleString(),
          String(entry.lines),
          String(entry.level),
        ]) {
          const cell = document.createElement('td');
          cell.textContent = text;
          row.append(cell);
        }
        const details = document.createElement('small');
        const minutes = Math.floor(entry.duration / 60);
        const seconds = Math.floor(entry.duration % 60)
          .toString()
          .padStart(2, '0');
        details.textContent = `${minutes}:${seconds} · ${new Date(entry.completedAt).toLocaleDateString()}`;
        row.children[1].append(details);
        return row;
      }),
    );
    this.dialog.querySelector<HTMLElement>('.leaderboard-empty')!.hidden = entries.length > 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.dialog.removeEventListener('click', this.click);
    this.dialog.removeEventListener('input', this.changeName);
    this.dialog.removeEventListener('change', this.changeFilter);
    this.dialog.removeEventListener('close', this.closed);
    if (this.dialog.open) this.dialog.close();
    this.dialog.remove();
  }
}
