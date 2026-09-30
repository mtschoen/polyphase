# Polyphase

An original browser falling-block game with five-cell and six-cell polyominoes.

## Development

- Node.js 22.12 or newer. `npm install`, then `npm run dev`.
- `npm run build`: TypeScript validation and production bundle.
- `npm test`: deterministic rules tests. `npm run coverage`: full source coverage report.
- `npm run lint`, `npm run format:check`: code checks.
- `npm run preview`: serve the production build.

## Architecture

- `src/game/`: deterministic rules, polyomino generation, and shared types.
- `src/audio.ts`: original Web Audio music and sound effects.
- `src/universe.ts`: Three.js animated cosmic environment.
- `src/renderer.ts`: board drawing and gameplay particles.
- `src/main.ts`, `src/interface.ts`, `src/style.css`: UI, controls, and game loop.

Inject random sources and advance simulation time explicitly in tests. No wall-clock assertions.
Keep game logic independent of DOM, audio, and graphics. Never use em dashes.
Writing agents must use sibling worktrees; the primary checkout remains on main.
Browser visual and audio paths require runtime smoke testing; report measured coverage honestly.
