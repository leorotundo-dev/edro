import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const issues = [];

function repoPath(...parts) {
  return path.join(repoRoot, ...parts);
}

function readRepoFile(relativePath) {
  return readFileSync(repoPath(relativePath), 'utf8');
}

for (const forbiddenPublicDir of [
  'apps/web/public/ux',
  'apps/web-cliente/public/ux',
  'apps/web-freelancer/public/ux',
]) {
  if (existsSync(repoPath(forbiddenPublicDir))) {
    issues.push(`Protótipos internos não podem ficar em superfícies públicas: ${forbiddenPublicDir}`);
  }
}

for (const nextConfigPath of [
  'apps/web/next.config.mjs',
  'apps/web-cliente/next.config.mjs',
  'apps/web-freelancer/next.config.mjs',
]) {
  if (!existsSync(repoPath(nextConfigPath))) continue;
  const content = readRepoFile(nextConfigPath);
  if (/productionBrowserSourceMaps\s*:\s*true/.test(content)) {
    issues.push(`Source maps públicos de produção não são permitidos em ${nextConfigPath}`);
  }
}

const backendDockerfile = readRepoFile('apps/backend/Dockerfile');
if (/ts-node\/register|\.\/src\/index\.ts/.test(backendDockerfile)) {
  issues.push('apps/backend/Dockerfile não pode iniciar produção com ts-node/src; use runtime compilado.');
}
if (!/apps\/backend\/dist/.test(backendDockerfile)) {
  issues.push('apps/backend/Dockerfile deve copiar artifacts compilados de apps/backend/dist para o runtime.');
}

if (issues.length) {
  console.error('Artifact exposure check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Artifact exposure check passed.');
