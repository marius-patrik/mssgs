import * as fs from 'node:fs';
import * as path from 'node:path';

const extensionDir = path.resolve(process.cwd());
const workspaceRoot = path.resolve(extensionDir, '../..');
const targetDir = path.join(extensionDir, 'out', 'node_modules');

const packages = ['better-sqlite3', 'bindings', 'file-uri-to-path'];

fs.mkdirSync(targetDir, { recursive: true });

for (const pkg of packages) {
  const source = path.join(workspaceRoot, 'node_modules', pkg);
  const destination = path.join(targetDir, pkg);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing dependency: ${source}`);
  }

  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
  console.log(`[stage-native-deps] copied ${pkg}`);
}
