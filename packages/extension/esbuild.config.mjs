#!/usr/bin/env node
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

/**
 * Bundle the extension entry point into a single ESM file.
 *
 * Pure-JS runtime dependencies are inlined. Native modules and modules
 * provided by the extension host stay external so they resolve at runtime.
 */
const config = {
  entryPoints: ['src/extension.ts'],
  outfile: 'out/extension.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'ES2022',
  sourcemap: false,
  minify: true,
  treeShaking: true,
  external: [
    // Provided by the VS Code extension host.
    'vscode',
    // Native SQLite module; must ship its prebuilt binary inside node_modules.
    'better-sqlite3',
    // Node.js built-ins are resolved by the extension host runtime.
    'node:*',
  ],
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[esbuild] watching for changes...');
} else {
  await esbuild.build(config);
  console.log('[esbuild] bundled out/extension.js');
}
