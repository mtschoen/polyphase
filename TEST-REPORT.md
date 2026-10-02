# Verification report

2026-10-01 (local date), final keyboard bindings and PR verification

| Field                    | Value                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Git                      | `fix/mobile-input`, `20686c2` (verified feature commit)                                              |
| Status                   | PASS                                                                                                 |
| Mode                     | Best effort; inherited incomplete unit coverage                                                      |
| Tests                    | 233 passed across 14 files; zero failures or skips                                                   |
| Coverage                 | 1319/2273 statements (58.02%); 954 uncovered; baseline 57.98%                                        |
| Lines                    | 1204/2051 (58.70%); baseline 58.69%                                                                  |
| Branches                 | 733/1142 (64.18%); baseline 63.48%                                                                   |
| Functions                | 220/377 (58.35%); baseline 58.28%                                                                    |
| ESLint                   | Zero findings                                                                                        |
| Formatting               | Prettier passed                                                                                      |
| TypeScript / Pages build | Passed; existing 533.07 KB Three.js chunk advisory                                                   |
| Aislop                   | Score 94; zero errors, five inherited warnings, seven informational findings, zero security findings |
| Independent review       | One sidebar overlap finding fixed; follow-up review reports no remaining findings                    |

## Runtime evidence

| Check             | Result                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile Chrome     | 12 mode/viewport cases passed; zero browser errors                                                                                                           |
| Viewports         | 280x653, 320x568, 320x480, 390x844, 768x896, 896x768, 844x390, 568x320, 1024x768, 1024x701                                                                   |
| Input             | Captured drift, exclusive D-pad, rotations, inactive gaps, hold/release/cancel, native activation and one drop per contact passed                            |
| Layout            | Setup/play/pause/game-over/dialog fit, targets >=44px, fullscreen/effects access, sidebar readability and cross-pad clearance passed                         |
| Desktop gameplay  | Seven modes, custom Fusion, rankings/settings and narrow mouse-only exclusion passed; zero browser errors                                                    |
| Production bundle | Desktop and phone passed assets, gameplay, Up/W/Space hard drops, effects toggle/persistence, Help link, atmosphere, pause and rankings; zero browser errors |
| Screenshots       | Portrait phone, Fold portrait/rotation and 1024x701 inspected                                                                                                |
| Audio/media       | Not rerun in this pass; audio implementation unchanged                                                                                                       |
| Physical devices  | Fold comfort remains user playtesting; no independent Safari/iOS or Firefox verification                                                                     |
| Publication       | Verified locally for PR; no merge or deployment                                                                                                              |

Full-source unit coverage includes every production TypeScript file. Browser integration checks do not contribute to unit coverage. Main, renderer, universe, Juice Lab and feedback retain zero unit coverage. Input coverage remains 89.16% lines; interface is 28.33% lines. No coverage exclusions or rule suppressions were added.

Inherited Aislop warnings: audio/engine/main file sizes, distinct club-kick oscillator blocks, and the known unreachable-return false positive in leaderboard code. Finding counts did not increase.

## Commands

```sh
npm run coverage
npm run lint
npm run format:check
npm run build:pages
aislop scan --json
node tests/mobile-smoke.mjs
node tests/browser-smoke.mjs
node tests/release-smoke.mjs
```

Browser checks used installed Chrome via `POLYPHASE_BROWSER`, the worktree development server and the local `/polyphase/` production preview. Logs and screenshots are under ignored `artifacts/`.
