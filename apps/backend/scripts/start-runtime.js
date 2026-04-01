const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const distIndexPath = path.join(appRoot, 'dist', 'src', 'index.js');
const srcIndexPath = path.join(appRoot, 'src', 'index.ts');
const runMigrateScript = path.join(__dirname, 'run-migrate.js');

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runNode([runMigrateScript]);

if (fs.existsSync(distIndexPath)) {
  runNode([distIndexPath]);
} else {
  runNode([require.resolve('ts-node/dist/bin.js'), '--transpile-only', srcIndexPath]);
}
