# Polyphase verification

Verified on 2026-09-30: escalating clear feedback, finer particles, full-effects defaults and stronger dance groove following `2de894b`. Effects, audio, UI integration and groove changes were independently reviewed. Coverage mode is best effort for an existing application with browser-driven modules; the previous full-source line baseline was 25.16%.

## Results

| Check                                | Result                                                            |
| ------------------------------------ | ----------------------------------------------------------------- |
| TypeScript and production build      | Passed (`npm run build`)                                          |
| ESLint                               | Passed (`npm run lint`)                                           |
| Prettier                             | Passed after formatting integrated files                          |
| Unit tests                           | 109 passed across seven test files                                |
| Browser playthrough                  | All seven modes and custom 3+5+6 Fusion passed; no browser errors |
| Native Web Audio and rendering smoke | Passed; no browser errors                                         |
| Independent code review              | Effects, clear sound, UI integration and dance groove approved    |

Browser checks covered movement, rotation, hold, hard drop, pause/resume, top-out, personal records and return to menu. Custom Fusion selection persisted across reload, rejected an empty selection, locked during play, changed the board size and meter label, and saved its own personal best. Settings, themes and mute also persisted. Focused native controls retained Space/Enter behavior, and a persisted page-hide event retained the renderer. The 390 by 844 layout had no horizontal overflow and usable touch controls.

The audio harness uses native AudioContext and an analyser. It observed nonzero music output for each pure size and custom 3+5+6, nonzero effect output, and silence after mute. Deterministic score tests verify melody identity, onset/duration, meter accents, full-bar transitions, tempo, theme changes and variation. Groove tests cover quarter-note kicks, compound pulses, open hats, bass answers and claps at low intensity. A review scheduling probe across every meter at low and high energy peaked at 24 music voices, below the 48-voice limit.

The separate effects-layer harness checks subtle landing dust early in its lifetime, drop trails, isolated clear and Resonance events, layering, pointer transparency, expiry, reset, disposal and reduced motion. Its former long-lived landing-burst expectation was updated for the requested small, brief dust. Real legal one-through-six-line clears produced increasing bursts: approximately 4,138 visible pixels for one line and 23,550 for six, including 4,542 outside the board. Every tier left zero effects pixels after 1.5 seconds of explicitly advanced simulation time. Labels and audio cues matched their tiers; level changes did not replace the clear, and pending gameplay clears did not announce while paused.

The browser UI harness confirmed full effects on fresh settings even when the OS preference requests reduced motion, plus all six named previews without score changes. Explicitly saved reduced motion remained respected. Desktop and mobile screenshots were inspected, including the six-line preview. Announcer tests cover voice choice, mute, volume, cancellation and disposal; speech availability and pronunciation depend on browser voices.

Reproduction commands are in [SMOKE.md](SMOKE.md). Generated screenshots and logs are in the ignored `artifacts/` directory.

## Unit coverage

The full integration coverage run includes every production TypeScript file. Browser smoke tests are separate and do not contribute to these figures.

| Scope                          | Statements | Branches | Functions | Lines  |
| ------------------------------ | ---------- | -------- | --------- | ------ |
| All production source          | 40.92%     | 45.13%   | 42.90%    | 40.93% |
| Rules, shapes and shared types | 100%       | 99.27%   | 100%      | 100%   |
| Musical score                  | 98.41%     | 88.00%   | 92.85%    | 98.30% |
| Dance groove                   | 100%       | 100%     | 100%      | 100%   |
| Clear tiers                    | 100%       | 100%     | 100%      | 100%   |
| Gameplay effects               | 95.63%     | 83.15%   | 94.73%    | 96.35% |
| Announcer                      | 95.12%     | 88.00%   | 90%       | 97.05% |

The remaining core branch is the defensive active-piece guard during Resonance. UI, persistence, feedback coordination and rendering primarily use native Chromium integration checks and have no unit coverage. Audio graph and older sound-effect paths have partial unit coverage plus native output checks. This is not a claim of full application coverage. Reports are in `coverage/`.

## Static review and limits

The full Aislop pass scored 99 with zero errors, one non-mechanical advisory for the 453-line score module, and informational arrow-glyph findings in documentation/controls. The score keeps its melody data and phrasing together; groove extraction reduced its size and removed the prior audio file-size advisory. No rules or thresholds were disabled. The security engine reported no issues.

Vite retains its size advisory for the Three.js chunk (about 533 KB before compression, 133 KB gzip). The application chunk is about 68 KB before compression.

Verification used Chromium on Windows. Firefox, Safari, physical touch input, subjective speaker/headphone quality and the Windows double-click launcher were not independently exercised. The launcher's underlying development-server command was exercised successfully. Music was verified structurally and through real audio output, not by a subjective listening evaluation.
