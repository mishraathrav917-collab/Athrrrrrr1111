'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { readUserscript, extractConst, loadFunctions } = require('./extract');

const REPO = path.join(__dirname, '..');
const REFERENCE = path.join(REPO, 'stake-mines-assets', 'reference', 'stake-mines-elements.txt');

// The captured markup the userscript has to support (2026-10-07 Stake build).
function capturedElements() {
  const lines = fs.readFileSync(REFERENCE, 'utf8').split(/\r?\n/);
  const elements = new Map();
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^#\s*element\s+(\d+)\b\s*(.*)$/);
    if (heading) {
      current = Number(heading[1]);
      elements.set(current, { label: heading[2].trim(), html: '' });
      continue;
    }
    if (current && line.trim() && !elements.get(current).html) {
      elements.get(current).html = line.trim();
    }
  }
  return elements;
}

const ELEMENTS = capturedElements();

function domFor(html) {
  return new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`);
}

const SANDBOX_FUNCTIONS = [
  'readATHRMinesSliderCount',
  'readATHRMinesSliderGemsCount',
  'readATHRMinesControlCount',
  'getATHRWiggleClickThreshold',
  'getATHRWiggleLayer',
  'syncATHRTileWiggle',
  'applyATHRWiggleToRevealedMines',
  'createATHRAssetGemMarkup',
  'getATHRGemAssetUrl',
  'escapeAssetUrl'
];

function loadApi(document, options = {}) {
  const source = readUserscript();
  return loadFunctions(source, SANDBOX_FUNCTIONS, [], {
    document,
    window: document.defaultView,
    GM_getResourceURL: options.getResourceUrl,
    getATHRMinesControl: options.getMinesControl
  });
}

test('captured reference markup is available', () => {
  assert.ok(ELEMENTS.has(3), 'mines count slider element missing');
  assert.ok(ELEMENTS.has(6), 'idle tile element missing');
  assert.ok(ELEMENTS.has(9), 'gem tile element missing');
  assert.ok(ELEMENTS.has(10), 'mine tile element missing');
});

test('new mines-count slider is read from the display node before Stake hydrates it', () => {
  const { window } = domFor(ELEMENTS.get(3).html);
  const api = loadApi(window.document, { getMinesControl: () => null });
  const range = window.document.querySelector('input[type="range"]');
  // An untouched range input reports the midpoint default (12.5 for 1..24), the
  // same value an unhydrated Stake slider would report, so the visible count node
  // has to win.
  assert.equal(range.value, '12.5');
  assert.equal(api.readATHRMinesSliderCount(), 3);
  assert.equal(api.readATHRMinesSliderGemsCount(), 22);
  assert.equal(api.readATHRMinesControlCount(), 3);
});

test('new mines-count slider falls back to the range value without a count node', () => {
  const { window } = domFor(ELEMENTS.get(3).html);
  const api = loadApi(window.document, { getMinesControl: () => null });
  window.document.querySelector('[data-testid="mines-count-mines"]').remove();
  window.document.querySelector('input[type="range"]').value = '7';
  assert.equal(api.readATHRMinesSliderCount(), 7);

  window.document.querySelector('[data-testid="mines-count-gems"]').remove();
  assert.equal(api.readATHRMinesSliderGemsCount(), 18);
});

test('legacy select mines control still works and falls back to the slider', () => {
  const { window } = domFor(ELEMENTS.get(3).html);
  const api = loadApi(window.document, { getMinesControl: () => ({ value: '5' }) });
  assert.equal(api.readATHRMinesControlCount(), 5);

  const outOfRange = loadApi(window.document, { getMinesControl: () => ({ value: '50' }) });
  assert.equal(outOfRange.readATHRMinesControlCount(), 3, 'unhydrated range value must fall back to the slider');

  const missing = loadApi(window.document, { getMinesControl: () => null });
  assert.equal(missing.readATHRMinesControlCount(), 3);
});

test('slider reader ignores pages without the new control', () => {
  const { window } = domFor('<select data-testid="mines-count"><option value="5" selected>5</option></select>');
  const api = loadApi(window.document, { getMinesControl: () => null });
  assert.equal(api.readATHRMinesSliderCount(), null);
  assert.equal(api.readATHRMinesSliderGemsCount(), null);
});

test('wiggle thresholds follow the supplied mine-count / click pattern', () => {
  const { window } = domFor('<div></div>');
  const api = loadApi(window.document);
  const expected = {
    1: 10, 2: 10, 3: 9, 4: 9, 5: 8, 6: 8, 7: 7, 8: 7, 9: 6, 10: 6, 11: 5, 12: 5,
    13: 4, 14: 4, 15: 3, 16: 3, 17: 2, 18: 2, 19: 2, 20: 2, 21: 1, 22: 1, 23: 1, 24: 0
  };
  for (const [mines, clicks] of Object.entries(expected)) {
    assert.equal(api.getATHRWiggleClickThreshold(Number(mines)), clicks, `mines ${mines}`);
  }
  assert.equal(api.getATHRWiggleClickThreshold('nope'), 0);
});

test('captured mine tile wiggles through the native wiggle layer contract', () => {
  const { window } = domFor(ELEMENTS.get(10).html);
  const document = window.document;
  const api = loadApi(document);
  const tile = document.querySelector('button.tile');
  const layer = document.querySelector('[data-testid="tile-wiggle-layer"]');

  assert.ok(layer, 'captured tile must expose the wiggle layer');
  assert.equal(tile.getAttribute('data-game-tile-status'), 'mine');
  assert.equal(tile.style.getPropertyValue('--wiggle-distance'), '1.6px');

  assert.equal(api.syncATHRTileWiggle(tile, 3, 8), false, 'below the 3-mine threshold');
  assert.equal(layer.classList.contains('wiggling'), false);
  assert.equal(tile.style.getPropertyValue('--wiggle-duration'), '0ms');

  assert.equal(api.syncATHRTileWiggle(tile, 3, 9), true, 'threshold reached');
  assert.equal(layer.classList.contains('wiggling'), true);
  assert.equal(tile.classList.contains('athr-wiggling'), true);
  assert.equal(tile.getAttribute('data-athr-wiggling'), 'true');
  assert.equal(tile.style.getPropertyValue('--wiggle-duration'), '226ms');
  assert.equal(tile.style.getPropertyValue('--wiggle-delay'), '-66ms');
  assert.equal(tile.style.getPropertyValue('--wiggle-angle'), '0.315deg');
  assert.equal(tile.style.getPropertyValue('--wiggle-distance'), '1.6px', 'captured amplitude is preserved');

  assert.equal(api.syncATHRTileWiggle(tile, 24, 25), false, '24 mines never wiggle');
  assert.equal(layer.classList.contains('wiggling'), false);
});

test('only revealed mines wiggle on the captured board', () => {
  const board = `<div class="wrap svelte-5k7xu3" data-testid="game-mines">
      <div data-testid="game-mines-board" class="board svelte-5k7xu3">
        ${ELEMENTS.get(6).html}${ELEMENTS.get(9).html}${ELEMENTS.get(10).html}
      </div>
    </div>`;
  const { window } = domFor(board);
  const api = loadApi(window.document);
  assert.equal(api.applyATHRWiggleToRevealedMines(3, 9), 1);
  assert.equal(window.document.querySelector('button.tile.mine').classList.contains('athr-wiggling'), true);
  assert.equal(window.document.querySelector('button.tile.gem').classList.contains('athr-wiggling'), false);
  assert.equal(window.document.querySelector('button.tile.idle').classList.contains('athr-wiggling'), false);
  assert.equal(api.applyATHRWiggleToRevealedMines(3, 1), 0);
});

test('revealed gem markup uses the captured Stake gem asset when it is cached', () => {
  const { window } = domFor('<div data-testid="game-mines-board"></div>');
  const asset = 'data:image/svg+xml;base64,PHN2Zy8+';
  const api = loadApi(window.document, { getResourceUrl: name => (name === 'athrGemSvg' ? asset : undefined) });
  const markup = api.createATHRAssetGemMarkup(true);
  assert.ok(markup, 'asset markup expected when the resource is cached');
  assert.match(markup, /data-testid="gem"/);
  assert.match(markup, /class="motion animation svelte-5u4wia"/);
  assert.match(markup, /class="cover gem svelte-1x9fqyl"/);
  assert.match(markup, /class="athr-gem-asset"/);
  const parsed = domFor(markup).window.document.querySelector('img.athr-gem-asset');
  assert.equal(parsed.getAttribute('src'), asset);

  const withoutResource = loadApi(window.document, { getResourceUrl: undefined });
  assert.equal(withoutResource.createATHRAssetGemMarkup(true), null, 'inline symbol stays the fallback');
});

test('captured hashes and test ids replaced the stale ones', () => {
  const source = readUserscript();
  assert.equal(source.includes('svelte-12ha7jh'), false, 'stale tile/cover hash must be gone');
  assert.equal(source.includes('svelte-1qwk2y9'), false, 'stale gem symbol hash must be gone');

  const clickedGem = extractConst(source, 'ATHR_GEM_CLICKED_MARKUP');
  assert.match(clickedGem, /class="gem svelte-5u4wia revealed" data-testid="gem"/);
  assert.match(clickedGem, /class="motion animation svelte-5u4wia"/);
  assert.match(clickedGem, /class="cover gem svelte-1x9fqyl"/);

  const resultGem = extractConst(source, 'ATHR_GEM_RESULT_MARKUP');
  assert.match(resultGem, /class="gem result-gem svelte-5u4wia" data-testid="gem"/);

  const mine = extractConst(source, 'ATHR_MINE_RESULT_MARKUP');
  assert.match(mine, /class="mine athr-result-mine svelte-1u6oqbc" data-testid="mine"/);

  const tileStyle = extractConst(source, 'ATHR_NATIVE_TILE_STYLE');
  for (const declaration of ['--reveal-duration: 160ms', '--mine-reveal-duration: 220ms', '--wiggle-distance: 1.6px', '--wiggle-drop: 0.65px']) {
    assert.ok(tileStyle.includes(declaration), `ATHR_NATIVE_TILE_STYLE missing ${declaration}`);
  }
});

test('new-DOM wiring is installed in the userscript', () => {
  const source = readUserscript();
  const installs = source.match(/installATHRMinesDomCompatStyles\(\);/g) || [];
  assert.ok(installs.length >= 2, `expected the compat stylesheet install, found ${installs.length}`);
  const wiggleHooks = source.match(/applyATHRWiggleToRevealedMines\(/g) || [];
  assert.ok(wiggleHooks.length >= 5, `expected wiggle hooks in the click/round flow, found ${wiggleHooks.length}`);
  assert.match(source, /\[data-testid="game-mines"\] > \.game-result-wrap \{/);
  assert.match(source, /@keyframes athr-grid-mine-wiggle \{/);
  assert.match(source, /\[data-testid="mines-count-slider"\]/);
});

test('every @resource points at a file that ships with the repository', () => {
  const source = readUserscript();
  const prefix = 'https://raw.githubusercontent.com/mishraathrav917-collab/Athrrrrrr1111/main/';
  const resources = [...source.matchAll(/^\/\/ @resource\s+(\S+)\s+(\S+)$/gm)].map(match => ({
    name: match[1],
    url: match[2]
  }));

  const soundResources = resources.filter(resource => /^athrSound\d+$/.test(resource.name));
  assert.equal(soundResources.length, 9, 'the capture ships nine decoded sounds');
  for (const resource of resources) {
    assert.ok(resource.url.startsWith(prefix), `${resource.name} must use the captured assets in this repo`);
    const file = path.join(REPO, resource.url.slice(prefix.length));
    assert.ok(fs.existsSync(file), `${resource.name} asset missing on disk: ${resource.url}`);
  }

  const names = new Set(resources.map(resource => resource.name));
  for (const expected of ['athrGemSvg', 'athrMinesKeyframes']) {
    assert.ok(names.has(expected), `${expected} resource missing`);
  }
  assert.match(source, /GM_getResourceURL\('athrGemSvg'\)/);
});

test('captured asset manifest matches the shipped files', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'stake-mines-assets', 'manifest.json'), 'utf8'));
  assert.equal(manifest.page, 'https://stake.ac/casino/games/mines');
  for (const file of manifest.files) {
    assert.ok(fs.existsSync(path.join(REPO, 'stake-mines-assets', file)), `manifest file missing: ${file}`);
  }
  const keyframes = fs.readFileSync(path.join(REPO, 'stake-mines-assets', 'animations', 'keyframes-and-rules.css'), 'utf8');
  assert.match(keyframes, /@keyframes svelte-1x9fqyl-wiggle/);
  assert.match(keyframes, /--wiggle-distance/);
});
