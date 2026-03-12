#!/usr/bin/env node
/**
 * patch-wdk.js
 * 
 * Patches @tetherto/wdk-wallet-evm/src/memory-safe/signing-key.js
 * 
 * Problem: The file uses ESM named import syntax to import sodium_memzero
 * from sodium-universal (a CommonJS module). Node 20 cannot resolve named
 * exports from CJS modules this way — causes SyntaxError at build time.
 * 
 * Fix: Replace the broken import with an inline implementation.
 * sodium_memzero just zeroes out a buffer — we replicate that with buf.fill(0).
 * Functionally identical. No security regression on testnet.
 */

const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(
  __dirname,
  '../node_modules/@tetherto/wdk-wallet-evm/src/memory-safe/signing-key.js'
);

if (!fs.existsSync(targetFile)) {
  console.log('[patch-wdk] Target file not found — skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Check if already patched
if (content.includes('// patched by patch-wdk.js')) {
  console.log('[patch-wdk] Already patched — skipping.');
  process.exit(0);
}

// Replace the broken ESM named import with an inline CJS-compatible implementation
const broken = `import { sodium_memzero } from 'sodium-universal'`;
const fixed = `// patched by patch-wdk.js — sodium-universal CJS cannot be ESM-imported by name
const sodium_memzero = (buf) => { if (buf && buf.fill) buf.fill(0); };`;

if (!content.includes(broken)) {
  console.log('[patch-wdk] Expected import line not found — file may have changed. Skipping.');
  process.exit(0);
}

content = content.replace(broken, fixed);
fs.writeFileSync(targetFile, content, 'utf8');
console.log('[patch-wdk] ✅ signing-key.js patched successfully.');