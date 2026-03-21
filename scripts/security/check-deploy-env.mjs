import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = { envFile: null, mode: null };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--env-file') {
      args.envFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--mode') {
      args.mode = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
}

function parseEnvFile(raw) {
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function hasValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function validateUrl(name, value, { productionLike, allowLocal = true }, issues) {
  if (!hasValue(value)) return;

  try {
    const parsedUrl = new URL(value);
    if (productionLike && parsedUrl.protocol !== 'https:' && !(allowLocal && isLocalHostname(parsedUrl.hostname))) {
      issues.push(`${name} deve usar https em produção/staging.`);
    }
  } catch {
    issues.push(`${name} deve ser uma URL absoluta válida.`);
  }
}

function validateOrigins(originsValue, productionLike, issues) {
  if (!hasValue(originsValue)) {
    issues.push('ALLOWED_ORIGINS é obrigatório.');
    return;
  }

  const origins = originsValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origins.length) {
    issues.push('ALLOWED_ORIGINS não pode estar vazio.');
    return;
  }

  if (productionLike && origins.includes('*')) {
    issues.push('ALLOWED_ORIGINS não pode conter "*" em produção/staging.');
  }

  for (const origin of origins) {
    if (origin === '*') continue;
    validateUrl(`ALLOWED_ORIGINS(${origin})`, origin, { productionLike }, issues);
  }
}

const args = parseArgs(process.argv.slice(2));
const fileEnv = {};

if (args.envFile) {
  const absoluteEnvPath = path.isAbsolute(args.envFile)
    ? args.envFile
    : path.join(repoRoot, args.envFile);
  if (!existsSync(absoluteEnvPath)) {
    console.error(`Env file não encontrado: ${absoluteEnvPath}`);
    process.exit(1);
  }
  Object.assign(fileEnv, parseEnvFile(readFileSync(absoluteEnvPath, 'utf8')));
}

const env = { ...process.env, ...fileEnv };
const mode = (args.mode || env.NODE_ENV || 'production').trim().toLowerCase();
const productionLike = mode === 'production' || mode === 'staging';

const issues = [];
const warnings = [];
const insecureSecretPattern = /^(secret|no-secret|changeme|change-me|default|placeholder)$/i;

for (const key of ['JWT_SECRET', 'EDRO_LOGIN_SECRET', 'WEB_URL']) {
  if (!hasValue(env[key])) {
    issues.push(`${key} é obrigatório para rollout seguro.`);
  }
}

if (!hasValue(env.EDRO_BACKEND_URL) && !hasValue(env.RAILWAY_SERVICE_EDRO_BACKEND_URL) && !hasValue(env.PUBLIC_API_URL)) {
  issues.push('Defina EDRO_BACKEND_URL, RAILWAY_SERVICE_EDRO_BACKEND_URL ou PUBLIC_API_URL para origem canônica do backend.');
}

if (hasValue(env.JWT_SECRET) && insecureSecretPattern.test(env.JWT_SECRET.trim())) {
  issues.push('JWT_SECRET usa um valor inseguro/reservado.');
}
if (hasValue(env.EDRO_LOGIN_SECRET) && insecureSecretPattern.test(env.EDRO_LOGIN_SECRET.trim())) {
  issues.push('EDRO_LOGIN_SECRET usa um valor inseguro/reservado.');
}
if (productionLike && env.JWT_SECRET && env.EDRO_LOGIN_SECRET && env.JWT_SECRET === env.EDRO_LOGIN_SECRET) {
  issues.push('EDRO_LOGIN_SECRET não pode reutilizar JWT_SECRET em produção/staging.');
}

validateOrigins(env.ALLOWED_ORIGINS, productionLike, issues);
validateUrl('WEB_URL', env.WEB_URL, { productionLike }, issues);
validateUrl('PUBLIC_API_URL', env.PUBLIC_API_URL, { productionLike }, issues);
validateUrl('EDRO_BACKEND_URL', env.EDRO_BACKEND_URL, { productionLike }, issues);
validateUrl('NEXT_PUBLIC_BACKEND_URL', env.NEXT_PUBLIC_BACKEND_URL, { productionLike }, issues);
validateUrl('NEXT_PUBLIC_API_URL', env.NEXT_PUBLIC_API_URL, { productionLike }, issues);
validateUrl('NEXT_PUBLIC_CLIENTE_URL', env.NEXT_PUBLIC_CLIENTE_URL, { productionLike }, issues);
validateUrl('NEXT_PUBLIC_FREELANCER_URL', env.NEXT_PUBLIC_FREELANCER_URL, { productionLike }, issues);

if (productionLike) {
  if (String(env.EDRO_LOGIN_ECHO_CODE || '').toLowerCase() === 'true') {
    issues.push('EDRO_LOGIN_ECHO_CODE deve permanecer false em produção/staging.');
  }
  if (String(env.ENABLE_TEMP_PGVECTOR_CHECK || '').toLowerCase() === 'true') {
    issues.push('ENABLE_TEMP_PGVECTOR_CHECK deve permanecer false em produção/staging.');
  }
}

const metaWebhookConfigured = [env.WHATSAPP_TOKEN, env.WHATSAPP_PHONE_ID, env.META_VERIFY_TOKEN].some(hasValue);
if (metaWebhookConfigured && !hasValue(env.META_APP_SECRET)) {
  issues.push('META_APP_SECRET é obrigatório quando Meta/WhatsApp webhook estiver habilitado.');
}

const metaOAuthConfigured = [env.META_APP_ID, env.META_APP_SECRET, env.META_REDIRECT_URI].some(hasValue);
if (metaOAuthConfigured) {
  if (!hasValue(env.META_APP_ID) || !hasValue(env.META_APP_SECRET)) {
    issues.push('Meta OAuth exige META_APP_ID e META_APP_SECRET.');
  }
  if (!hasValue(env.META_REDIRECT_URI) && !hasValue(env.PUBLIC_API_URL)) {
    issues.push('Meta OAuth exige META_REDIRECT_URI ou PUBLIC_API_URL.');
  }
}

const gmailConfigured = [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI, env.GOOGLE_PUBSUB_TOPIC].some(hasValue);
if (gmailConfigured) {
  if (!hasValue(env.GOOGLE_CLIENT_ID) || !hasValue(env.GOOGLE_CLIENT_SECRET)) {
    issues.push('Gmail OAuth exige GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
  }
  if (!hasValue(env.GOOGLE_REDIRECT_URI) && !hasValue(env.PUBLIC_API_URL)) {
    issues.push('Gmail OAuth exige GOOGLE_REDIRECT_URI ou PUBLIC_API_URL.');
  }
}

const calendarConfigured = [env.GOOGLE_CALENDAR_REDIRECT_URI, env.GOOGLE_CALENDAR_WEBHOOK_URL].some(hasValue);
if (calendarConfigured) {
  if (!hasValue(env.GOOGLE_CLIENT_ID) || !hasValue(env.GOOGLE_CLIENT_SECRET)) {
    issues.push('Google Calendar exige GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
  }
  if (!hasValue(env.GOOGLE_CALENDAR_WEBHOOK_URL)) {
    issues.push('GOOGLE_CALENDAR_WEBHOOK_URL é obrigatório quando Google Calendar estiver habilitado.');
  }
}

const oidcConfigured = [env.OIDC_ISSUER_URL, env.OIDC_CLIENT_ID, env.OIDC_CLIENT_SECRET, env.OIDC_REDIRECT_URI].some(hasValue);
if (oidcConfigured) {
  if (!hasValue(env.OIDC_ISSUER_URL) || !hasValue(env.OIDC_CLIENT_ID) || !hasValue(env.OIDC_CLIENT_SECRET) || !hasValue(env.OIDC_REDIRECT_URI)) {
    issues.push('OIDC exige OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET e OIDC_REDIRECT_URI juntos.');
  }
}

if (hasValue(env.EVOLUTION_API_URL) && hasValue(env.PUBLIC_API_URL) && !hasValue(env.EVOLUTION_WEBHOOK_SECRET)) {
  issues.push('EVOLUTION_WEBHOOK_SECRET é obrigatório quando Evolution estiver exposto por webhook.');
}

if (hasValue(env.RECALL_API_KEY) && !hasValue(env.RECALL_WEBHOOK_SECRET)) {
  issues.push('RECALL_WEBHOOK_SECRET é obrigatório quando Recall estiver habilitado.');
}

if (!hasValue(env.RESEND_API_KEY) && !hasValue(env.SMTP_PASS)) {
  warnings.push('Nenhum provedor de email detectado; OTP e convites podem falhar.');
}

if (!hasValue(env.S3_SECRET_KEY) && !hasValue(env.FILE_STORAGE_ROOT)) {
  warnings.push('Nenhum backend de storage detectado; valide o fluxo de arquivos do ambiente alvo.');
}

if (issues.length) {
  console.error(`Deploy env check failed with ${issues.length} issue(s).`);
  if (warnings.length) {
    console.error(`Warnings recorded: ${warnings.length}.`);
  }
  process.exit(1);
}

console.log('Deploy env check passed.');
if (warnings.length) {
  console.log(`Warnings recorded: ${warnings.length}.`);
}
