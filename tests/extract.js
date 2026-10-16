'use strict';

// Minimal source extractor: pulls named function declarations and simple const
// declarations out of the userscript so the real implementation (not a copy) can
// be executed against the captured Stake Mines markup in a jsdom sandbox.

const fs = require('node:fs');
const path = require('node:path');

const USERSCRIPT = path.join(
  __dirname,
  '..',
  'ATHR-Multi-Wallet-Mines-5.7.14-SLIDER-PAYOUT-FIX.user.js'
);

function readUserscript() {
  return fs.readFileSync(USERSCRIPT, 'utf8');
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`function ${name} not found`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function extractConst(source, name) {
  const marker = `const ${name} =`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`const ${name} not found`);
  let depth = 0;
  let quote = null;
  let inTemplate = false;
  for (let i = start + marker.length; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (inTemplate) {
      if (char === '\\') i += 1;
      else if (char === '`') inTemplate = false;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '`') { inTemplate = true; continue; }
    if (char === '{' || char === '[' || char === '(') depth += 1;
    else if (char === '}' || char === ']' || char === ')') depth -= 1;
    else if (char === ';' && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated const ${name}`);
}

// Builds a sandbox with the requested userscript functions/consts evaluated.
function loadFunctions(source, functionNames, constNames, globals = {}) {
  const pieces = [
    ...constNames.map(name => extractConst(source, name)),
    ...functionNames.map(name => extractFunction(source, name))
  ];
  const names = Object.keys(globals);
  const values = names.map(name => globals[name]);
  const exported = [...functionNames, ...constNames].join(', ');
  // eslint-disable-next-line no-new-func
  const factory = new Function(...names, `${pieces.join('\n')}\nreturn { ${exported} };`);
  return factory(...values);
}

module.exports = { USERSCRIPT, readUserscript, extractFunction, extractConst, loadFunctions };
