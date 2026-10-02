# Verification report

| Field              | Value                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------- |
| Date               | 2026-10-01                                                                            |
| Git reference      | `fix/mobile-input`, control height and touch timing after `485e3c5`, with this report |
| Status             | PASS: unit suite, lint, formatting, Pages build and native browser checks             |
| Mode               | Best effort; full-source line coverage 58.69%, baseline 58.55%                        |
| Unit tests         | 227 passed across 14 files; zero failures or skips                                    |
| Browser errors     | Zero in successful gameplay, media, mobile and production-bundle checks               |
| Independent review | Mobile layout and input reviewed; reported findings resolved and rechecked in Chrome  |

## Coverage

| Scope                 | Statements         | Branches          | Functions        | Lines              |
| --------------------- | ------------------ | ----------------- | ---------------- | ------------------ |
| All production source | 57.98% (1315/2268) | 63.48% (725/1142) | 58.28% (218/374) | 58.69% (1201/2046) |
| Previous baseline     | 57.85%             | 63.18%            | 58.17%           | 58.55%             |
| Game rules and shapes | 100%               | 99.35%            | 100%             | 100%               |
| Input                 | 86.66%             | 81.37%            | 100%             | 89.16%             |
| Interface             | 25.86%             | 28.57%            | 21.42%           | 25.45%             |
| Effects               | 96.68%             | 89.92%            | 95.23%           | 96.90%             |
| Audio engine          | 89.05%             | 81.42%            | 87.50%           | 93.69%             |

Unit tests cover control availability, Hold reset with an unchanged held preview, Resonance presentation, exclusive D-pad ownership, native activation and one-step soft drop without advancing simulation time. Browser integration checks do not contribute to unit coverage. Main, renderer, universe, Juice lab and feedback retain zero unit coverage. All production TypeScript remains included; this is not full application coverage.

## Runtime checks

This follow-up reran all 11 mobile cases, the 227-test coverage suite, lint, formatting, the Pages build, Aislop and the broad gameplay browser check. Audio evidence below comes from `d8be42f`; audio code is unchanged. Left/Right now span the full D-pad height while Up/Down split the middle column, with inactive gaps retained. Rotation SVGs are centered in their buttons at every tested size. Deterministic and native input checks verify one cell for a 280 ms touch, a 320 ms initial repeat delay, 110 ms repeats, no catch-up bursts after delayed frames, release/reset behavior and unchanged keyboard timing.

| Check                         | Result                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile viewport fit           | 11 mode/viewport cases passed across 280x653, 320x568, 320x480, 390x844, 768x896, 896x768, 844x390, 568x320 and 1024x768                                                             |
| Mobile states                 | Setup, Fusion selection, play, pause, game over, leaderboard and Fold-like resize fit without page scrolling; visible controls have at least 44-pixel targets and unobscured centers |
| Touch input                   | Both rotations, captured drift, inactive gaps, one D-pad direction, simultaneous rotation, movement repeat, release/cancel/blur, and single hard drop per contact passed             |
| Hold                          | Button and preview dim when unavailable; next piece restores availability, including an unchanged held preview                                                                       |
| Resonance                     | Real Monotris play charged and activated the button; fixture verified action, charged styling and both OS/app reduced-motion preferences                                             |
| Native activation             | Focused touch buttons work through native keyboard/assistive clicks; Soft drop advances one row without remaining held                                                               |
| Mobile chrome                 | Pause/Resume, atmosphere switching without pausing, fixed music/deck under shake, and mouse-only desktop exclusion passed                                                            |
| Seven modes and custom Fusion | Movement, rotation, hold, drop, pause/resume, topout, records, menus and persistence passed                                                                                          |
| Rankings and settings         | Save-once, names, filters, storage recovery, impact controls and Konami lab passed                                                                                                   |
| Native audio and effects      | Six meters, custom Fusion, mute, pumping/output boost, action cues, particles and legal Flow/Rush clears passed                                                                      |
| Production bundle             | Desktop and phone at `/polyphase/` passed assets/favicon, WebGL, gameplay, atmosphere, pause and saved rankings                                                                      |
| Visual inspection             | Small portrait, Fold-like portrait, landscape Fusion, game over, charged Resonance and production phone screenshots inspected                                                        |

The broad gameplay harness initially timed out after sending keys immediately after a mode's start-button click. Explicitly focusing the board, as its other gameplay flows already do, made the complete check pass. The mobile harness caught delayed disabled-state projection on pause; status changes now update controls synchronously, and the full mobile check passed afterward.

Verification used installed Chrome. Physical Android/iOS devices, Safari and Firefox were not independently exercised. Fold sizes and rotation were emulated; thumb comfort still needs device playtesting. Audio checks measure browser output, not subjective listening quality. No production deployment was performed.

## Static checks

| Tool                            | Result                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| TypeScript and Vite Pages build | Passed; correct `/polyphase/` asset prefix                 |
| ESLint                          | Zero findings                                              |
| Prettier                        | Passed                                                     |
| Aislop                          | Score 94, zero errors, five warnings, zero automatic fixes |
| Aislop security                 | Zero findings                                              |

Aislop reports file-size advisories for audio, engine and main, distinct kick oscillator configurations, and the known false-positive unreachable return at `leaderboard.ts:94` (exercised by tests). The prior report listed four warnings; the current scan also reports engine size. The base engine already exceeded this scanner's 400-line advisory before these changes (433 physical lines, 402 nonblank). These are retained structural advisories, not suppressed rules. Seven informational typography findings refer to intentional UI symbols. No thresholds, exclusions or rules were weakened. Vite retains the existing 533.07 KB Three.js chunk-size advisory.

## Reproduction

Run `npm run coverage`, `npm run lint`, `npm run format:check`, `npm run build:pages` and `aislop scan --json`. With the development server running, run `node tests/browser-smoke.mjs`, `node tests/mobile-smoke.mjs` and `node tests/media-smoke.mjs`. Start `npm run preview -- --base=/polyphase/` and run `node tests/release-smoke.mjs` for the production bundle.

Browser harnesses select installed Chrome through `POLYPHASE_BROWSER`. See [SMOKE.md](SMOKE.md) for details. Logs, screenshots and coverage are ignored artifacts. The Pages workflow independently verifies pushes to `main` before publishing; this branch was verified locally.
