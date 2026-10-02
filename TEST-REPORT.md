# Polyphase release verification

| Field              | Result                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| Date               | 2026-09-30                                                                     |
| Git reference      | `8c2225e` plus accompanying GitHub link and initial mobile layout fix          |
| Status             | PASS: production build, unit suite, lint, formatting and native browser checks |
| Mode               | Best effort; unit line coverage 57.89%, previous 57.98%                        |
| Unit tests         | 212 passed across 12 files; zero failures or skips                             |
| Browser errors     | Zero in successful gameplay, media, mobile and production-bundle checks        |
| Independent review | Mobile layout, shake isolation, Pause/Resume state and Pages workflow reviewed |

## Coverage

| Scope                 | Statements         | Branches          | Functions        | Lines              |
| --------------------- | ------------------ | ----------------- | ---------------- | ------------------ |
| All production source | 57.05% (1262/2212) | 61.08% (667/1092) | 57.73% (209/362) | 57.89% (1155/1995) |
| Game rules and shapes | 100%               | 99.32%            | 100%             | 100%               |
| Effects               | 96.68%             | 89.92%            | 95.23%           | 96.90%             |
| Input                 | 81.48%             | 67.14%            | 100%             | 85.41%             |
| Leaderboard data      | 96.05%             | 91.02%            | 100%             | 100%               |
| Leaderboard panel     | 77.31%             | 43.63%            | 81.25%           | 84.61%             |
| Audio engine          | 89.05%             | 81.42%            | 87.50%           | 93.69%             |

Three additional DOM integration lines are covered by native browser checks, which do not contribute to unit coverage. Main, renderer, universe, interface, Juice lab and feedback retain zero unit coverage. All production TypeScript remains included; this is not full application coverage.

## Runtime checks

| Check                               | Result                                                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Seven modes and custom 3+5+6 Fusion | Movement, rotation, hold, drop, pause/resume, topout, records and menu passed                                                                  |
| Rankings                            | Correct mix/pace, save-once, immediate restart, names, storage, duplicates and blocked-storage recovery passed                                 |
| Settings and Juice lab              | Impact controls, Konami unlock, repeated previews, keyboard behavior and persistence passed                                                    |
| Native audio                        | Six meters, custom Fusion, mute, pumping, output boost and 18 action/theme cases passed                                                        |
| Clear effects                       | Landing, trails, escalation, reduced motion and 12 legal Flow/Rush clear cases passed                                                          |
| Mobile layouts                      | 320x568, 390x844 and 844x390 passed, including direct default Pentris start without a mode selection                                           |
| Mobile music                        | Three atmosphere buttons remain visible, meet 44x44 targets, update the track and keep gameplay running                                        |
| Mobile pause                        | Visible Pause/Resume label, high-contrast button and working state transitions passed                                                          |
| Screen shake                        | Music dock stays anchored; translated game surface does not widen the layout viewport                                                          |
| Mobile input                        | Movement, rotation, hold, soft/hard drop, simultaneous contacts, repeat, release and cancellation passed                                       |
| Production bundle                   | Desktop and phone checks at `/polyphase/` passed: assets/favicon, WebGL, gameplay, atmosphere, pause, saved rankings and desktop Konami unlock |
| GitHub source link                  | Opens the repository in a new tab; visible on desktop and mobile with a 44-pixel tap target                                                    |
| Visual inspection                   | Small portrait, landscape and production desktop/phone screenshots inspected                                                                   |

Production verification used installed Chrome with the NVIDIA GPU. The legacy Chromium headless shell's software SwiftShader renderer lost its WebGL context on the production bundle; hardware Chrome initialized and passed. Physical Android/iOS devices, Safari and Firefox were not independently exercised. Audio checks measure actual browser output, not subjective listening quality.

## Static checks

| Tool                            | Result                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| TypeScript and Vite Pages build | Passed; correct `/polyphase/` asset prefix                 |
| ESLint                          | Zero findings                                              |
| Prettier                        | Passed                                                     |
| Aislop                          | Score 95, zero errors, four warnings, zero automatic fixes |
| Aislop security                 | Zero findings                                              |

Aislop retains the existing audio-module size advisory, main-module size advisory (483 lines), distinct kick oscillator configurations, and false-positive unreachable-code warning at `leaderboard.ts:94`. Valid-entry tests execute the flagged return; leaderboard data has 100% line coverage. No rules, thresholds or exclusions were weakened. Vite retains the Three.js chunk-size advisory (533.07 KB before compression).

## Commands

```powershell
npm run coverage
npm run lint
npm run build:pages
npm run format:check
aislop scan --json
npm run preview -- --base=/polyphase/
node tests/release-smoke.mjs
node tests/browser-smoke.mjs
node tests/media-smoke.mjs
node tests/mobile-smoke.mjs
```

Browser harnesses selected installed Chrome with `POLYPHASE_BROWSER`. The release harness defaults to the production preview and accepts `POLYPHASE_URL` for the live Pages address. Reproduction details are in [SMOKE.md](SMOKE.md); logs, screenshots and coverage reports are ignored artifacts. The Pages workflow independently runs lint, formatting, coverage and the release build before deploying pushes to `main`.
