# Polyphase verification

| Field              | Result                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Date               | 2026-09-30                                                                                          |
| Git reference      | `5e04a6c` plus accompanying mobile and leaderboard integration changes                              |
| Status             | PASS: build, unit suite, lint, formatting and native browser checks                                 |
| Mode               | Best effort; prior unit line coverage 51.85%, current 57.98%                                        |
| Unit tests         | 212 passed across 12 files; zero failures or skips                                                  |
| Browser errors     | Zero in gameplay, media and mobile harnesses                                                        |
| Independent review | Particle sampling, touch ownership, leaderboard persistence and completed-run finalization reviewed |

## Coverage

Native browser checks are separate from unit coverage. No production source is excluded from the unit report.

| Scope                 | Statements         | Branches          | Functions        | Lines              |
| --------------------- | ------------------ | ----------------- | ---------------- | ------------------ |
| All production source | 57.12% (1262/2209) | 61.19% (667/1090) | 57.73% (209/362) | 57.98% (1155/1992) |
| Game rules and shapes | 100%               | 99.32%            | 100%             | 100%               |
| Effects               | 96.68%             | 89.92%            | 95.23%           | 96.90%             |
| Input                 | 81.48%             | 67.14%            | 100%             | 85.41%             |
| Leaderboard data      | 96.05%             | 91.02%            | 100%             | 100%               |
| Leaderboard panel     | 77.31%             | 43.63%            | 81.25%           | 84.61%             |
| Audio engine          | 89.05%             | 81.42%            | 87.50%           | 93.69%             |

The main loop, board renderer, universe, interface, Juice lab and feedback coordinator retain zero unit coverage and receive native browser checks. Persistence and sound-effect paths retain partial unit coverage. This is not full application coverage.

## Runtime checks

| Check                               | Result                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Seven modes and custom 3+5+6 Fusion | Movement, rotation, hold, drop, pause/resume, topout, records and menu passed                                                             |
| Local rankings                      | Completed score saved once in every mode; same-turn topout/restart retains the run                                                        |
| Ranking persistence                 | Names, ordering, top-ten bounds, mix/pace scopes, duplicate IDs, corrupt/blocked storage, stale-tab merging and HTTP UUID fallback passed |
| Settings and Juice lab              | Normalized defaults/ranges, saved mix, Konami unlock, previews, synchronization, keyboard behavior and persistence passed                 |
| Native audio                        | Six meters, custom Fusion, mute, pumping, output boost and 18 action/theme cases passed                                                   |
| Effects and entry timing            | Landing, drop trails, clear escalation, reduced motion, reset/disposal and 12 legal Flow/Rush clear cases passed                          |
| Mobile layouts                      | 320x568, 390x844 and 844x390 passed without horizontal overflow or offscreen gameplay controls                                            |
| Mobile input                        | Native touch movement, rotation, hold, soft/hard drop, simultaneous contacts, repeat, release and cancellation passed                     |
| Touch targets                       | Gameplay, Resonance, Pause and visible toolbar controls meet 44x44 minimum                                                                |
| Phone serving                       | LAN HTTP request returned 200; all mobile cases passed through the LAN address                                                            |
| Visual inspection                   | Desktop leaderboard, phone leaderboard, portrait and landscape gameplay screenshots inspected                                             |

Chromium on Windows was exercised. Physical Android/iOS devices, Safari, Firefox and the Windows double-click launcher were not independently exercised. The launcher's underlying LAN development-server command was exercised. Audio measurements verify actual browser output, not subjective speaker or headphone quality.

## Particle benchmark

Native Chrome measurements used a deterministic 3,528-particle six-line clear at 100% density and 300% size. Benchmarks ran separately from other browser checks. Default-size sampling is unchanged.

| Device pixel ratio | Baseline completed raster work | Adaptive sampling | Reduction |
| ------------------ | ------------------------------ | ----------------- | --------- |
| 1                  | 54.9 ms                        | 46.7 ms           | 14.9%     |
| 2                  | 64.1 ms                        | 56.1 ms           | 12.5%     |

Completed-work measurements include a readback fence. The separate no-readback steady-frame cadence remained about 30.3 ms, so an overall FPS increase was not demonstrated by this stress test. Large effects use softer sampling; particle counts, logical sizes, additive brightness, fades and the board rendering remain unchanged. Default-density five-cell landing cadence was about 6.1 ms in the native benchmark. These are descriptive performance measurements, not test timing gates.

## Static checks

| Tool                   | Result                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| TypeScript and Vite    | Passed; existing Three.js chunk advisory, 533.07 KB before compression |
| ESLint                 | Zero findings                                                          |
| Prettier               | Passed                                                                 |
| Aislop                 | Score 95, zero errors, four warnings, zero automatic fixes             |
| Aislop security engine | Zero findings                                                          |

Aislop retains three existing advisories: 481-line audio module, main module now 482 lines, and the two intentionally distinct kick oscillator configurations. Its fourth warning, `unreachable-code` at `leaderboard.ts:94`, is a false positive on a return following a conditional validation guard; valid-entry tests execute that return and the module has 100% line coverage. Informational arrow-glyph findings and punctuation in the scanner's own ignored logs remain. No rules, thresholds or exclusions were weakened.

## Commands

```powershell
npm run coverage
npm run lint
npm run build
npm run format:check
aislop scan --json
npm run dev:lan
node tests/browser-smoke.mjs
node tests/media-smoke.mjs
node tests/mobile-smoke.mjs
node tests/particle-benchmark.mjs adaptive-resolution
```

Browser harnesses use `POLYPHASE_BROWSER` when selecting an installed Chromium executable. Mobile verification set `POLYPHASE_URL` to the live LAN address. Benchmark comparisons used the isolated particle worktree with the corresponding baseline and final effects modules. Reproduction details are in [SMOKE.md](SMOKE.md); generated logs, screenshots and coverage reports are ignored artifacts.
