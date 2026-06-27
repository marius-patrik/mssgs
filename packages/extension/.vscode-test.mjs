import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@vscode/test-cli';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  files: 'out/test/**/*.test.js',
  version: 'stable',
  extensionDevelopmentPath: __dirname,
  mocha: {
    timeout: 20000,
  },
});
