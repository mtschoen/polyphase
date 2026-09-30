# Polyphase

An original browser falling-block game with one-cell through six-cell polyominoes and custom Fusion mixes.

## Development

- Node.js 22.12 or newer. `npm install`, then `npm run dev`.
- `npm run build`: TypeScript validation and production bundle.
- `npm test`: deterministic rules tests. `npm run coverage`: full source coverage report.
- `npm run lint`, `npm run format:check`: code checks.
- `npm run preview`: serve the production build.
- `node tests/browser-smoke.mjs` and `node tests/media-smoke.mjs`: real browser checks against a running dev server. See SMOKE.md for browser setup.

## Architecture

- `src/game/`: deterministic rules, polyomino generation, and shared types.
- `src/audio.ts`, `src/club-kick.ts`: Web Audio graph, synthesis, layered kick and melodic side-chain envelope.
- `src/score.ts`, `src/score-melodies.ts`, `src/groove.ts`: piece-count meters, short repeating folk hooks and percussion/bass arrangement.
- `src/clear-tiers.ts`, `src/feedback.ts`, `src/sound-effects.ts`, `src/announcer.ts`: shared clear tiers, coordinated feedback, synthesized stingers and optional browser speech.
- `src/universe.ts`: Three.js animated cosmic environment.
- `src/renderer.ts`, `src/effects.ts`: board drawing and unclipped gameplay particles.
- `src/main.ts`, `src/interface.ts`, `src/input.ts`, `src/storage.ts`: UI, controls, persistence and game loop.
- `src/style.css`, `src/styles/`: shared tokens, board, panels, dialogs and responsive layouts.

Inject random sources and advance simulation time explicitly in tests. No wall-clock assertions.
Keep game logic independent of DOM, audio, and graphics. Never use em dashes.
Writing agents must use sibling worktrees; the primary checkout remains on main.
Browser visual and audio paths require runtime smoke testing; report measured coverage honestly.
