// ==UserScript==
// @name         ATHR Stake Mines Wiggle Patch
// @namespace    https://github.com/mishraathrav917-collab/Athrrrrrr1111
// @version      1.0.0
// @description  Adds Stake Mines wiggle animation based on mine count and click threshold. Works with the tile markup from the provided Stake mine DOM.
// @match        *://*/*
// @grant       none
// ==/UserScript==

(function () {
  'use strict';

  const WIGGLE_BY_MINE_COUNT = [
    { min: 1, max: 2, clicks: 10 },
    { min: 3, max: 4, clicks: 9 },
    { min: 5, max: 6, clicks: 8 },
    { min: 7, max: 8, clicks: 7 },
    { min: 9, max: 10, clicks: 6 },
    { min: 11, max: 12, clicks: 5 },
    { min: 13, max: 14, clicks: 4 },
    { min: 15, max: 16, clicks: 3 },
    { min: 17, max: 18, clicks: 2 },
    { min: 19, max: 20, clicks: 2 },
    { min: 21, max: 22, clicks: 1 },
    { min: 23, max: 23, clicks: 1 },
    { min: 24, max: 24, clicks: 0 }
  ];

  function getMineCountFromDom() {
    const slider = document.querySelector('[data-testid="mines-count-slider"], .mines-count, [data-testid="mines-slider"]');
    if (!slider) return 0;

    const text = (slider.textContent || '').replace(/\D+/g, ' ').trim();
    if (text) {
      const parsed = Number(text.split(/\s+/).at(-1));
      if (Number.isFinite(parsed)) return parsed;
    }

    const ariaValue = slider.getAttribute('aria-valuenow');
    if (ariaValue) {
      const parsed = Number(ariaValue);
      if (Number.isFinite(parsed)) return parsed;
    }

    const value = Number(slider.getAttribute('data-value') || slider.dataset.value || 0);
    if (Number.isFinite(value)) return value;

    return 0;
  }

  function getClickThresholdForMines(mineCount) {
    if (mineCount >= 24) return 9999;

    for (const rule of WIGGLE_BY_MINE_COUNT) {
      if (mineCount >= rule.min && mineCount <= rule.max) return rule.clicks;
    }

    return 0;
  }

  function getTargetLayer(tile) {
    if (!tile) return null;
    return tile.querySelector('.wiggle-layer, [data-testid="tile-wiggle-layer"]') || tile;
  }

  function isMineTile(tile) {
    if (!tile) return false;
    if (tile.classList.contains('mine') || tile.dataset.gameTileStatus === 'mine') return true;
    if (tile.querySelector('.tile.mine')) return true;
    return false;
  }

  function syncTileWiggle(tile, mineCount) {
    if (!tile || !tile.isConnected) return;

    const layer = getTargetLayer(tile);
    if (!layer) return;

    const mineThreshold = getClickThresholdForMines(mineCount);
    const clickCount = Number(tile.dataset.athrWiggleClicks || 0);
    const isMine = isMineTile(tile);

    if (!isMine || mineCount >= 24) {
      layer.classList.remove('wiggling');
      layer.style.setProperty('--wiggle-angle', '0deg');
      layer.style.setProperty('--wiggle-distance', '0px');
      layer.style.setProperty('--wiggle-lift', '0px');
      layer.style.setProperty('--wiggle-drop', '0px');
      layer.style.setProperty('--wiggle-duration', '0ms');
      layer.style.setProperty('--wiggle-delay', '0ms');
      return;
    }

    if (clickCount >= mineThreshold) {
      layer.classList.add('wiggling');
      layer.style.setProperty('--wiggle-angle', '0.315deg');
      layer.style.setProperty('--wiggle-distance', '0.4px');
      layer.style.setProperty('--wiggle-lift', '0.25px');
      layer.style.setProperty('--wiggle-drop', '0.1625px');
      layer.style.setProperty('--wiggle-duration', '226ms');
      layer.style.setProperty('--wiggle-delay', '-66ms');
    } else {
      layer.classList.remove('wiggling');
    }
  }

  function attachTile(tile) {
    if (!tile || tile.dataset.athrWiggleBound === '1') return;
    tile.dataset.athrWiggleBound = '1';

    tile.addEventListener('click', () => {
      tile.dataset.athrWiggleClicks = String(Number(tile.dataset.athrWiggleClicks || 0) + 1);
      syncTileWiggle(tile, getMineCountFromDom());
    }, { passive: true });

    tile.addEventListener('mouseenter', () => {
      syncTileWiggle(tile, getMineCountFromDom());
    }, { passive: true });
  }

  const css = `
    .tile .wiggle-layer,
    .tile [data-testid="tile-wiggle-layer"],
    [data-testid="tile-wiggle-layer"] {
      position: relative;
      display: inline-block;
      transform-origin: center center;
      will-change: transform;
    }

    .tile .wiggle-layer.wiggling,
    .tile [data-testid="tile-wiggle-layer"].wiggling,
    [data-testid="tile-wiggle-layer"].wiggling {
      animation: athrStakeMineWiggle var(--wiggle-duration, 226ms) ease-in-out var(--wiggle-delay, -66ms) infinite alternate;
    }

    @keyframes athrStakeMineWiggle {
      0% {
        transform: rotate(0deg) translate3d(0, 0, 0);
      }
      15% {
        transform: rotate(calc(var(--wiggle-angle, 0.315deg) * -1)) translate3d(calc(var(--wiggle-distance, 0.4px) * -1), calc(var(--wiggle-lift, 0.25px) * -1), 0);
      }
      50% {
        transform: rotate(var(--wiggle-angle, 0.315deg)) translate3d(var(--wiggle-distance, 0.4px), var(--wiggle-lift, 0.25px), 0);
      }
      85% {
        transform: rotate(calc(var(--wiggle-angle, 0.315deg) * -1)) translate3d(calc(var(--wiggle-distance, 0.4px) * -1), calc(var(--wiggle-drop, 0.1625px) * -1), 0);
      }
      100% {
        transform: rotate(0deg) translate3d(0, 0, 0);
      }
    }
  `;

  const styleTag = document.createElement('style');
  styleTag.id = 'athr-stake-mine-wiggle-patch';
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  function refreshAllTiles() {
    const mineCount = getMineCountFromDom();
    document.querySelectorAll('.tile, [data-testid^="game-tile-"]')
      .forEach((tile) => {
        attachTile(tile);
        syncTileWiggle(tile, mineCount);
      });
  }

  const observer = new MutationObserver(() => {
    refreshAllTiles();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-game-tile-status', 'data-testid', 'aria-valuenow']
  });

  refreshAllTiles();
})();
