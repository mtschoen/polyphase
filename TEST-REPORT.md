# Polyphase verification

Verified on 2026-09-30: the particle, music and configurable-mode update following `d6c4edc`. Engine and score changes were independently reviewed before integrating `381b302` and `04a0e3a`.

## Results

| Check                                | Result                                                            |
| ------------------------------------ | ----------------------------------------------------------------- |
| TypeScript and production build      | Passed (`npm run build`)                                          |
| ESLint                               | Passed (`npm run lint`)                                           |
| Prettier                             | Passed after formatting integrated files                          |
| Unit tests                           | 85 passed: 70 rules/catalog tests and 15 score tests              |
| Browser playthrough                  | All seven modes and custom 3+5+6 Fusion passed; no browser errors |
| Native Web Audio and rendering smoke | Passed; no browser errors                                         |
| Independent code review              | Engine, score, particle layer and UI integration approved         |

Browser checks covered movement, rotation, hold, hard drop, pause/resume, top-out, personal records and return to menu. Custom Fusion selection persisted across reload, rejected an empty selection, locked during play, changed the board size and meter label, and saved its own personal best. Settings, themes and mute also persisted. Focused native controls retained Space/Enter behavior, and a persisted page-hide event retained the renderer. The 390 by 844 layout had no horizontal overflow and usable touch controls.

The audio harness uses native AudioContext and an analyser. It observed nonzero music output for each pure size and custom 3+5+6, nonzero effect output, and silence after mute. Deterministic score tests verify melody identity, onset/duration, meter accents, full-bar transitions, tempo, theme changes and variation.

The old particle assertion could pass on board pixels alone. It has been replaced with a separate effects-layer check: actual engine drop particles remain visible after the shockwave and drop trail expire, including beyond board boundaries. Lock, clear and Resonance events are tested separately after resets. The harness also checks layer visibility, pointer transparency, expiry, reset, disposal and reduced motion. Actual composited desktop and mobile screenshots were visually inspected, including hard-drop bursts.

Reproduction commands are in [SMOKE.md](SMOKE.md). Generated screenshots and logs are in the ignored `artifacts/` directory.

## Unit coverage

The full integration coverage run includes every production TypeScript file. Browser smoke tests are separate and do not contribute to these figures.

| Scope                          | Statements | Branches | Functions | Lines  |
| ------------------------------ | ---------- | -------- | --------- | ------ |
| All production source          | 25.80%     | 30.14%   | 33.06%    | 25.16% |
| Rules, shapes and shared types | 100%       | 99.27%   | 100%      | 100%   |
| Musical score                  | 97.43%     | 88.50%   | 85.71%    | 98.64% |

The remaining core branch is the defensive active-piece guard during Resonance. Browser-facing modules have no unit coverage; their integration behavior is checked by the real Chromium harnesses. This is not a claim of full application coverage. Reports are in `coverage/`.

## Static review and limits

The full Aislop pass reported zero errors. Its repeated waveform literal warning was fixed with the existing named waveform constant. A targeted score follow-up leaves file-size advisories for the cohesive audio graph and score modules, plus intentional arrow glyphs in controls from the full pass. No rules or thresholds were disabled. The dependency audit completed without vulnerabilities.

Vite retains its size advisory for the Three.js chunk (about 533 KB before compression, 133 KB gzip). The application chunk is about 61 KB before compression.

Verification used Chromium on Windows. Firefox, Safari, physical touch input, subjective speaker/headphone quality and the Windows double-click launcher were not independently exercised. The launcher's underlying development-server command was exercised successfully. Music was verified structurally and through real audio output, not by a subjective listening evaluation.
