# Impact controls and fuller feedback

Goal: Restore the early glowing particle character, especially on landing, and let the player tune density, size and shake. Make routine action sounds audible over the approved music.

Architecture: Shared typed impact ranges feed persisted settings, native sliders and the board effects renderer. Existing canvas effects, score-safe previews and deterministic game rules remain in place. Audio changes stay in synthesized action cues.

Tech stack: TypeScript, Canvas, Web Audio, native range inputs, Vitest and Playwright.

- [ ] Root: add shared impact ranges, persistence, labelled sliders, values and landing preview. Defaults: density 150%, size 100% of restored glow, shake 125%. Ranges: density 0-400%, size 25-250%, shake 0-300%. Reduced motion overrides effects while retaining slider choices.
- [ ] Visual lane in sibling worktree: restore broad glow, white-hot centers and varied sparks, including a fuller landing spray. Implement BoardEffects.setImpactSettings and BoardRenderer.setImpactSettings. Independently scale count, dimensions and shake; preserve bounded work, ghost masking and clear entry delay.
- [ ] Audio lane in sibling worktree: trace action events, strengthen distinct rotate/move/drop/landing/hold cues as needed, preserving music and clear stingers.
- [ ] Root and reviewers: deterministic settings/renderer checks, native slider persistence and extremes, landing/clear previews, full-volume audio, desktop/mobile layout, one final full suite and Aislop scan.
- [ ] Update durable documentation, commit verified integration, release locks and remove this temporary plan.
