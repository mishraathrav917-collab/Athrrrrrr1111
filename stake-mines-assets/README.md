# Stake Mines assets (new build capture)

These files come from the user-supplied capture repository
`https://github.com/mishraathrav917-collab/Requires-`:

- `10 NEW ELEMENT OF STAKE of mines (1).txt` (copied here as
  `reference/stake-mines-elements.txt`) - the live DOM of the updated Stake
  Mines game.
- `stake-mines-assets.zip` - the decoded game assets, extracted in place below.

Capture metadata (`manifest.json`): page `https://stake.ac/casino/games/mines`,
captured `2026-10-07T16:35:07.802Z`.

## What changed in the new Stake build (used by the userscript update)

| Area | New markup |
| --- | --- |
| Mines count | `div.mines-count[data-testid="mines-count-slider"]` -> `div.slider-control[data-testid="mines-count-control"]` with `input[type=range][min=1][max=24][step=1]`, plus display nodes `[data-testid="mines-count-mines"]` and `[data-testid="mines-count-gems"]` |
| Board | `div.wrap[data-testid="game-mines"] > div.board[data-testid="game-mines-board"]` |
| Tile | `button.tile.svelte-1x9fqyl[data-game-tile-status][data-game-tile-index][data-testid="game-tile-N"][data-revealed]` carrying `--reveal-duration`, `--mine-reveal-duration`, `--wiggle-angle`, `--wiggle-distance`, `--wiggle-lift`, `--wiggle-drop`, `--wiggle-duration`, `--wiggle-delay` |
| Tile layer | `div[data-testid="tile-wiggle-layer"].wiggle-layer > div.cover.{idle,gem,mine} > .tile-bottom + .tile-top` |
| Revealed gem | `div.gem[data-testid="gem"].svelte-5u4wia.revealed > div.animation > canvas.reveal[data-testid="lottie-reveal"]` |
| Revealed mine | `div.mine[data-testid="mine"].svelte-1u6oqbc.revealed > div.animation > canvas.reveal[data-testid="lottie-reveal"]` |
| Result card | `div.game-result-wrap.{win,lose}.svelte-1g8uakg` (no longer a child of `[data-testid="game-mines-board"]`) |

Animation names in the new build: `svelte-1x9fqyl-hide`,
`svelte-1x9fqyl-fetching`, `svelte-5u4wia-scale-up`, `svelte-1u6oqbc-scale-up`,
`svelte-1x9fqyl-reveal`, `svelte-1x9fqyl-wiggle`.

## Files and how the userscript uses them

| File | `@resource` name in `ATHR-Multi-Wallet-Mines-*.user.js` |
| --- | --- |
| `sounds/decoded-2193-c7f32c87.mp3` | `athrSound1` |
| `sounds/decoded-13254-dadc6691.webm` | `athrSound2` |
| `sounds/decoded-13243-2e3f52f7.webm` | `athrSound3` |
| `sounds/decoded-16978-d18d9fdd.webm` | `athrSound4` |
| `sounds/decoded-16785-8db69a25.webm` | `athrSound5` |
| `sounds/decoded-18169-6045884f.webm` | `athrSound6` |
| `sounds/decoded-16982-97ba3108.webm` | `athrSound7` |
| `sounds/decoded-2925-5d62d60c.mp3` | `athrSound8` |
| `sounds/decoded-15725-8da2cbb9.mp3` | `athrSound9` |
| `svg/gem.Cu7BpPNc.svg` | `athrGemSvg` (revealed gem artwork) |
| `animations/keyframes-and-rules.css` | `athrMinesKeyframes` (reference for the injected wiggle CSS) |
| `other/gem.JGeVl7-s.lottie`, `other/mine.NZDJIy5D.lottie` | kept as the native dotLottie source; not injected because no dotLottie player is bundled |

The sound files are mapped in `manifest.json` order, which is the only ordering
the capture provides; the userscript keeps its own tier table on top of it.

## Wiggle pattern

The new build wiggles revealed mines through `--wiggle-*` custom properties and
the `svelte-1x9fqyl-wiggle` keyframes. The mine-count / click thresholds used by
the userscript match the pattern supplied separately:

| Mines | Clicks before wiggling |
| --- | --- |
| 1-2 | 10 |
| 3-4 | 9 |
| 5-6 | 8 |
| 7-8 | 7 |
| 9-10 | 6 |
| 11-12 | 5 |
| 13-14 | 4 |
| 15-16 | 3 |
| 17-20 | 2 |
| 21-23 | 1 |
| 24 | never |
