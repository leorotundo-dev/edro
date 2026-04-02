const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const distDir = path.join(appRoot, 'dist');

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

fs.rmSync(distDir, { recursive: true, force: true });

// Run tsc — type errors are non-fatal (noEmitOnError: false in tsconfig).
// Only fail if tsc encounters a fatal parse/config error (no output produced).
{
  const tscResult = spawnSync(
    process.execPath,
    [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'],
    { cwd: appRoot, stdio: 'inherit', env: process.env },
  );
  if (tscResult.error) throw tscResult.error;
  if (!fs.existsSync(path.join(distDir, 'src'))) {
    console.error('[build] tsc produced no output — fatal compilation error');
    process.exit(tscResult.status ?? 1);
  }
}

copyDir(path.join(appRoot, 'src', 'db', 'migrations'), path.join(distDir, 'src', 'db', 'migrations'));
copyDir(path.join(appRoot, 'src', 'data'), path.join(distDir, 'src', 'data'));
