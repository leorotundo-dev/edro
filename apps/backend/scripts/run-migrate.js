const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const distMigratePath = path.join(appRoot, 'dist', 'src', 'db', 'migrate.js');
const srcMigratePath = path.join(appRoot, 'src', 'db', 'migrate.ts');

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 0);
}

if (fs.existsSync(distMigratePath)) {
  runNode([distMigratePath]);
} else {
  runNode([require.resolve('ts-node/dist/bin.js'), '--transpile-only', srcMigratePath]);
}
