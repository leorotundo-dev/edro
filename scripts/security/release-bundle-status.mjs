import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const autoStageListPath = path.join(
  repoRoot,
  'docs',
  'security',
  'SECURITY_AUTOSTAGE_CANDIDATES_2026-03-22.txt',
);

const excludedPaths = [
  'apps/web/tsconfig.tsbuildinfo',
  'apps/web-cliente/tsconfig.tsbuildinfo',
  'apps/web-freelancer/tsconfig.tsbuildinfo',
  'apps/web-cliente/next-env.d.ts',
  'apps/web-freelancer/next-env.d.ts',
  'tmp_admin_equipe_live.html',
];

function git(...args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readLines(filePath) {
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function matchesPathspec(filePath, pathspec) {
  return filePath === pathspec || filePath.startsWith(`${pathspec}/`);
}

function collectAllChangedFiles() {
  const modified = git('diff', '--name-only')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const untracked = git('ls-files', '--others', '--exclude-standard')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return Array.from(new Set([...modified, ...untracked])).sort();
}

function collectStagedFiles() {
  const output = git('diff', '--cached', '--name-only');
  if (!output) return [];
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

if (!existsSync(autoStageListPath)) {
  console.error('Arquivo de auto-stage ausente:', autoStageListPath);
  process.exit(1);
}

const autoStageSpecs = readLines(autoStageListPath);
const changedFiles = collectAllChangedFiles();
const stagedFiles = collectStagedFiles();
const stagedSet = new Set(stagedFiles);

const autoStageMatches = changedFiles.filter((filePath) =>
  autoStageSpecs.some((pathspec) => matchesPathspec(filePath, pathspec)),
);
const autoStageStaged = stagedFiles.filter((filePath) =>
  autoStageSpecs.some((pathspec) => matchesPathspec(filePath, pathspec)),
);

const excludedMatches = changedFiles.filter((filePath) =>
  excludedPaths.some((pathspec) => matchesPathspec(filePath, pathspec)),
);

const manualReviewMatches = changedFiles.filter(
  (filePath) =>
    !autoStageMatches.includes(filePath) &&
    !excludedMatches.includes(filePath),
);

const excludedStaged = stagedFiles.filter((filePath) =>
  excludedPaths.some((pathspec) => matchesPathspec(filePath, pathspec)),
);

console.log('Security release bundle status');
console.log('');
console.log(`Auto-stage pathspecs: ${autoStageSpecs.length}`);
console.log(`Changed/untracked files covered by auto-stage: ${autoStageMatches.length}`);
console.log(`Auto-stage files already staged: ${autoStageStaged.length}`);
console.log(`Changed files remaining for manual review: ${manualReviewMatches.length}`);
console.log(`Excluded generated/temp files present: ${excludedMatches.length}`);
console.log(`Excluded generated/temp files staged: ${excludedStaged.length}`);
console.log('');

if (autoStageMatches.length > 0) {
  console.log('Auto-stage coverage:');
  for (const filePath of autoStageMatches) {
    console.log(`- ${filePath}`);
  }
  console.log('');
}

if (autoStageStaged.length > 0) {
  console.log('Auto-stage files currently staged:');
  for (const filePath of autoStageStaged) {
    console.log(`- ${filePath}`);
  }
  console.log('');
}

if (excludedMatches.length > 0) {
  console.log('Excluded from release:');
  for (const filePath of excludedMatches) {
    console.log(`- ${filePath}`);
  }
  console.log('');
}

if (manualReviewMatches.length > 0) {
  console.log('Manual-review bucket:');
  for (const filePath of manualReviewMatches) {
    console.log(`- ${filePath}`);
  }
  console.log('');
}

if (excludedStaged.length > 0) {
  console.log('Warning: excluded files already staged:');
  for (const filePath of excludedStaged) {
    console.log(`- ${filePath}`);
  }
  process.exitCode = 2;
} else {
  console.log('No excluded files are currently staged.');
}

console.log('');
console.log(
  'Next: use docs/security/SECURITY_RELEASE_BUNDLE_2026-03-22.md to review the remaining manual bucket.',
);
