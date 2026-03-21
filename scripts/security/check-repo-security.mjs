import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const issues = [];
const warnings = [];

const requiredFiles = [
  '.github/workflows/security-gates.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/dependency-review.yml',
  '.github/workflows/gitleaks.yml',
  'SECURITY.md',
  'docs/security/DEPLOYMENT_SECURITY_BASELINE.md',
  'docs/security/PRODUCTION_ROLLOUT_CHECKLIST.md',
  'docs/security/SECURITY_HOMOLOGATION_CHECKLIST.md',
  'docs/security/SECRETS_AND_ROTATION_MATRIX.md',
];

function repoPath(...parts) {
  return path.join(repoRoot, ...parts);
}

function readRepoFile(relativePath) {
  return readFileSync(repoPath(relativePath), 'utf8');
}

function ensureFile(relativePath, message) {
  if (!existsSync(repoPath(relativePath))) {
    issues.push(message ?? `Arquivo obrigatório ausente: ${relativePath}`);
  }
}

function ensureContent(relativePath, pattern, message) {
  const content = readRepoFile(relativePath);
  if (!pattern.test(content)) {
    issues.push(message);
  }
}

function walk(dir, collector) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === 'dist' ||
        relativePath.includes('/public/ux')
      ) {
        continue;
      }
      walk(absolutePath, collector);
      continue;
    }

    collector(absolutePath, relativePath);
  }
}

for (const relativePath of requiredFiles) {
  ensureFile(relativePath);
}

ensureContent(
  'package.json',
  /"security:repo"\s*:/,
  'package.json deve expor o script "security:repo".',
);
ensureContent(
  'package.json',
  /"security:verify"\s*:\s*"[^"]*security:repo[^"]*"/,
  'security:verify deve executar security:repo antes dos gates principais.',
);
ensureContent(
  '.github/workflows/security-gates.yml',
  /pnpm security:verify/,
  'security-gates.yml deve executar pnpm security:verify.',
);
ensureContent(
  'apps/backend/src/routes/index.ts',
  /ENABLE_TEMP_PGVECTOR_CHECK/,
  'routes/index.ts deve manter o gate explícito de ENABLE_TEMP_PGVECTOR_CHECK.',
);
ensureContent(
  'apps/backend/src/routes/index.ts',
  /env\.NODE_ENV/,
  'routes/index.ts deve bloquear o endpoint temporário fora de ambientes seguros.',
);
ensureContent(
  'apps/backend/src/routes/sso.ts',
  /code_challenge_method:\s*'S256'/,
  'SSO deve usar PKCE com S256.',
);
ensureContent(
  'apps/backend/src/routes/sso.ts',
  /\/api\/auth\/sso\/complete/,
  'SSO deve concluir sessão via bridge POST, não via token em URL.',
);

const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const browserTokenPatterns = [
  /localStorage\.(getItem|setItem)\([^)]*['"`]edro_token['"`]/,
  /localStorage\.(getItem|setItem)\([^)]*['"`]edro_refresh['"`]/,
  /sessionStorage\.(getItem|setItem)\([^)]*['"`]edro_token['"`]/,
  /sessionStorage\.(getItem|setItem)\([^)]*['"`]edro_refresh['"`]/,
];
const insecureSecretFallbackPatterns = [
  /\?\?\s*['"`](secret|no-secret)['"`]/,
  /\|\|\s*['"`](secret|no-secret)['"`]/,
];

for (const relativeDir of ['apps/backend/src', 'apps/web', 'apps/web-cliente', 'apps/web-freelancer']) {
  walk(repoPath(relativeDir), (absolutePath, relativePath) => {
    if (!codeExtensions.has(path.extname(absolutePath))) return;
    if (relativePath.endsWith('.tsbuildinfo')) return;

    const content = readFileSync(absolutePath, 'utf8');

    for (const pattern of browserTokenPatterns) {
      if (pattern.test(content)) {
        issues.push(`Token sensível não pode voltar para browser storage: ${relativePath}`);
        break;
      }
    }

    for (const pattern of insecureSecretFallbackPatterns) {
      if (pattern.test(content)) {
        issues.push(`Fallback inseguro de segredo encontrado em ${relativePath}`);
        break;
      }
    }
  });
}

for (const loginPath of [
  'apps/web/app/login/page.tsx',
  'apps/web-cliente/app/login/page.tsx',
  'apps/web-freelancer/app/login/page.tsx',
]) {
  if (!existsSync(repoPath(loginPath))) continue;
  const content = readRepoFile(loginPath);
  if (/hash\.get\('token'\)|params\.get\('token'\)/.test(content)) {
    issues.push(`Bootstrap legado por token em URL ainda existe em ${loginPath}`);
  }
}

const uxLegacyHits = [];
walk(repoPath('apps/web/public/ux'), (absolutePath, relativePath) => {
  const ext = path.extname(absolutePath);
  if (!['.html', '.js'].includes(ext)) return;
  const content = readFileSync(absolutePath, 'utf8');
  if (/edro_token|Bearer\s+`/.test(content)) {
    uxLegacyHits.push(relativePath);
  }
});

if (uxLegacyHits.length) {
  const preview = uxLegacyHits.slice(0, 5).join(', ');
  warnings.push(
    `Ativos legados em public/ux ainda contêm exemplos de token/Bearer (${uxLegacyHits.length} arquivo(s)): ${preview}${uxLegacyHits.length > 5 ? ', ...' : ''}`,
  );
}

if (issues.length) {
  console.error('Repo security check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  if (warnings.length) {
    console.error('\nWarnings:\n');
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log('Repo security check passed.');
if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
