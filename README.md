# ATHR Stake Mines userscripts

Local/demo Tampermonkey presentation layer for the Stake Mines game, plus a
separate wiggle-pattern patch.

| File | Purpose |
| --- | --- |
| `ATHR-Multi-Wallet-Mines-5.7.14-SLIDER-PAYOUT-FIX.user.js` | Main script (now **5.7.15**): multi-wallet panel, fake-bet engine, predictor, sounds, payout card |
| `ATHR-Mines-Wiggle-Pattern.user.js` | Standalone patch that only reproduces the mine wiggle pattern |
| `stake-mines-assets/` | Assets captured from the updated Stake Mines build (see its README) |
| `tests/` | Node + jsdom regression tests for the new Stake Mines DOM |

## 5.7.15 update (new Stake Mines build, captured 2026-10-07)

Stake reworked the Mines game DOM. The script now supports the new build while
keeping the previous one working:

- **Mines count slider** - the legacy `select[data-testid="mines-count"]` was
  replaced by `[data-testid="mines-count-slider"]` / `[data-testid="mines-count-control"]`
  with the rendered counts in `[data-testid="mines-count-mines"]` and
  `[data-testid="mines-count-gems"]`. The visible count node is read first,
  because an unhydrated `input[type=range]` still reports the HTML midpoint
  default (12.5 for 1..24) instead of the real selection.
- **Tile markup** - `button.tile` now exposes `data-game-tile-status`,
  `data-game-tile-index`, a `[data-testid="tile-wiggle-layer"]` and the
  `--wiggle-*` / `--reveal-duration` / `--mine-reveal-duration` custom
  properties. Tile hashes were refreshed (`svelte-1x9fqyl` for tiles/covers,
  `svelte-5u4wia` for the gem symbol, `svelte-1u6oqbc` for the mine symbol) and
  the generated markup now carries the matching `data-testid` hooks.
- **Wiggle** - revealed mines wiggle through Stake's own contract
  (`.wiggling` on the wiggle layer plus `--wiggle-angle/-duration/-delay` on the
  tile) once the round reaches the mine-count/click threshold; 24 mines never
  wiggle. A copy of the native `svelte-1x9fqyl-wiggle` keyframes is injected so
  the motion also works before Stake's stylesheet loads.
- **Assets** - the nine decoded sounds, the gem SVG and the keyframe reference
  from the capture are shipped in `stake-mines-assets/` and referenced through
  `@resource`, so the revealed gem uses Stake's own artwork.
- **Result card** - the payout card is no longer a child of the board element,
  so the new `[data-testid="game-mines"] > .game-result-wrap` container is styled
  too.

## Tests

```bash
npm install
npm test
```

The suite loads the captured markup from
`stake-mines-assets/reference/stake-mines-elements.txt`, executes the real
userscript functions in jsdom and asserts the slider reading, wiggle contract,
markup hashes and `@resource` wiring.
