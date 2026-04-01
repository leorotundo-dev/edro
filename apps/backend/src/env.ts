import 'dotenv/config';
import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  PORT: z.coerce.number().optional(),
  NODE_ENV: z
    .enum(['development', 'test', 'production', 'staging'])
    .default('development'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_BASE_URL: z.string().optional(),
  GEMINI_ENDPOINT: z.string().optional(),
  GEMINI_RESPONSE_MIME: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
  CLAUDE_MODEL: z.string().optional(),
  CLAUDE_BASE_URL: z.string().optional(),
  CLAUDE_VERSION: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  EDRO_ALLOWED_DOMAINS: z.string().optional(),
  EDRO_ADMIN_EMAILS: z.string().optional(),
  EDRO_ENFORCE_PRIVILEGED_MFA: envBoolean.optional(),
  EDRO_LOGIN_CODE_TTL_MINUTES: z.coerce.number().optional(),
  EDRO_LOGIN_ECHO_CODE: envBoolean.optional(),
  EDRO_LOGIN_SECRET: z.string().optional(),
  EDRO_ICLIPS_NOTIFY_EMAIL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  FILE_STORAGE_ROOT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_FORCE_PATH_STYLE: envBoolean.optional(),
  JOBS_RUNNER_ENABLED: envBoolean.optional(),
  JOBS_RUNNER_INTERVAL_MS: z.coerce.number().optional(),
  MASTER_KEY_B64: z.string().optional(),
  OIDC_ISSUER_URL: z.string().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  OIDC_REDIRECT_URI: z.string().optional(),
  WEB_URL: z.string().optional(),
  PUBLIC_API_URL: z.string().optional(),
  PUBLISHER_GATEWAY_URL: z.string().optional(),
  GATEWAY_SHARED_SECRET: z.string().optional(),
  ENABLE_METRICS: envBoolean.optional(),
  CALENDAR_CSV_PATH: z.string().optional(),
  CALENDAR_YEAR: z.coerce.number().optional(),
  SOCIAL_DATA_API_URL: z.string().optional(),
  SOCIAL_DATA_API_KEY: z.string().optional(),
  RAPIDAPI_KEY: z.string().optional(),
  META_GRAPH_VERSION: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),
  REPORTEI_BASE_URL: z.string().url().optional().or(z.literal('')),
  REPORTEI_TOKEN: z.string().optional(),
  CLIENT_INTEL_ENABLED: envBoolean.optional(),
  CLIENT_INTEL_INTERVAL_MS: z.coerce.number().optional(),
  CLIENT_INTEL_MAX_URLS: z.coerce.number().optional(),
  CLIENT_INTEL_MAX_DOCS: z.coerce.number().optional(),
  CLIENT_INTEL_MAX_CHARS: z.coerce.number().optional(),
  CALENDAR_RECALC_ENABLED: envBoolean.optional(),
  CALENDAR_RECALC_INTERVAL_MS: z.coerce.number().optional(),
  CALENDAR_RECALC_FROM: z.string().optional(),
  CALENDAR_RECALC_TO: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().optional(),
  WHATSAPP_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_AGENCY_PHONES: z.string().optional(), // comma-separated: +5511999990000,+5511888880000
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  LEONARDO_API_KEY: z.string().optional(),
  FAL_API_KEY: z.string().optional(),
  // Instagram DMs (Meta webhook verify token)
  META_VERIFY_TOKEN: z.string().optional(),
  // Google OAuth (Gmail + Calendar)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_PUBSUB_TOPIC: z.string().optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().optional(),
  GOOGLE_CALENDAR_WEBHOOK_URL: z.string().optional(),
  RECALL_API_KEY: z.string().optional(),
  RECALL_REGION: z.string().optional(),
  RECALL_GOOGLE_LOGIN_GROUP_ID: z.string().optional(),
  RECALL_WEBHOOK_SECRET: z.string().optional(),
  ENABLE_TEMP_PGVECTOR_CHECK: z.coerce.boolean().optional(),
  // D4Sign e-signature
  D4SIGN_TOKEN_API: z.string().optional(),
  D4SIGN_CRYPT_KEY: z.string().optional(),
  D4SIGN_SAFE_UUID: z.string().optional(),
  D4SIGN_SANDBOX: envBoolean.optional(),
  D4SIGN_WEBHOOK_SECRET: z.string().optional(),
});

// Railway injects RAILWAY_SERVICE_<NAME>_URL for linked services (no https:// prefix)
const railwayEvoUrl = process.env.RAILWAY_SERVICE_EVOLUTION_API_URL
  ? `https://${process.env.RAILWAY_SERVICE_EVOLUTION_API_URL}`
  : undefined;

const parsed = envSchema.parse({
  ...process.env,
  // Use Railway service reference as fallback if explicit vars not set
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || railwayEvoUrl,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || process.env.RAILWAY_SERVICE_EVOLUTION_API_KEY,
});

const isProductionLike = parsed.NODE_ENV === 'production' || parsed.NODE_ENV === 'staging';
const allowUnsafeLocalAuthHelpers = parsed.NODE_ENV === 'development' || parsed.NODE_ENV === 'test';
const portalLoginSecret = parsed.EDRO_LOGIN_SECRET || parsed.JWT_SECRET;

function hasValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function validateUrl(name: string, value: string | undefined, issues: string[]) {
  if (!hasValue(value)) return;

  try {
    const url = new URL(value!);
    if (isProductionLike && url.protocol !== 'https:' && !isLocalHostname(url.hostname)) {
      issues.push(`${name} deve usar https em ${parsed.NODE_ENV}.`);
    }
  } catch {
    issues.push(`${name} deve ser uma URL absoluta válida.`);
  }
}

function validateSecureRuntimeConfig() {
  const issues: string[] = [];
  const insecureSecretPattern = /^(secret|no-secret|changeme|change-me|default|placeholder)$/i;

  if (insecureSecretPattern.test(parsed.JWT_SECRET.trim())) {
    issues.push('JWT_SECRET usa um valor inseguro/reservado.');
  }

  if (hasValue(parsed.EDRO_LOGIN_SECRET) && insecureSecretPattern.test(parsed.EDRO_LOGIN_SECRET!.trim())) {
    issues.push('EDRO_LOGIN_SECRET usa um valor inseguro/reservado.');
  }

  if (isProductionLike) {
    if (parsed.EDRO_LOGIN_ECHO_CODE) {
      issues.push('EDRO_LOGIN_ECHO_CODE deve permanecer desabilitado em produção/staging.');
    }

    if (parsed.ENABLE_TEMP_PGVECTOR_CHECK) {
      issues.push('ENABLE_TEMP_PGVECTOR_CHECK deve permanecer desabilitado em produção/staging.');
    }

    if (!hasValue(parsed.EDRO_LOGIN_SECRET)) {
      issues.push('EDRO_LOGIN_SECRET é obrigatório em produção/staging.');
    } else if (parsed.EDRO_LOGIN_SECRET === parsed.JWT_SECRET) {
      issues.push('EDRO_LOGIN_SECRET não pode reutilizar JWT_SECRET em produção/staging.');
    }

    const allowedOrigins = (parsed.ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (allowedOrigins.includes('*')) {
      issues.push('ALLOWED_ORIGINS não pode conter "*" em produção/staging.');
    }
  }

  validateUrl('WEB_URL', parsed.WEB_URL, issues);
  validateUrl('PUBLIC_API_URL', parsed.PUBLIC_API_URL, issues);
  validateUrl('OIDC_ISSUER_URL', parsed.OIDC_ISSUER_URL, issues);
  validateUrl('OIDC_REDIRECT_URI', parsed.OIDC_REDIRECT_URI, issues);
  validateUrl('META_REDIRECT_URI', parsed.META_REDIRECT_URI, issues);
  validateUrl('GOOGLE_REDIRECT_URI', parsed.GOOGLE_REDIRECT_URI, issues);
  validateUrl('GOOGLE_CALENDAR_REDIRECT_URI', parsed.GOOGLE_CALENDAR_REDIRECT_URI, issues);
  validateUrl('GOOGLE_CALENDAR_WEBHOOK_URL', parsed.GOOGLE_CALENDAR_WEBHOOK_URL, issues);

  const oidcConfigured = [
    parsed.OIDC_ISSUER_URL,
    parsed.OIDC_CLIENT_ID,
    parsed.OIDC_CLIENT_SECRET,
    parsed.OIDC_REDIRECT_URI,
  ].some(hasValue);
  if (oidcConfigured) {
    if (!hasValue(parsed.OIDC_ISSUER_URL) || !hasValue(parsed.OIDC_CLIENT_ID) || !hasValue(parsed.OIDC_CLIENT_SECRET) || !hasValue(parsed.OIDC_REDIRECT_URI)) {
      issues.push('OIDC exige OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET e OIDC_REDIRECT_URI juntos.');
    }
    if (!hasValue(parsed.WEB_URL)) {
      issues.push('WEB_URL é obrigatório quando OIDC estiver habilitado.');
    }
  }

  const gmailConfigured = [
    parsed.GOOGLE_CLIENT_ID,
    parsed.GOOGLE_CLIENT_SECRET,
    parsed.GOOGLE_REDIRECT_URI,
    parsed.GOOGLE_PUBSUB_TOPIC,
  ].some(hasValue);
  if (gmailConfigured) {
    if (!hasValue(parsed.GOOGLE_CLIENT_ID) || !hasValue(parsed.GOOGLE_CLIENT_SECRET)) {
      issues.push('Gmail OAuth exige GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
    }
    if (!hasValue(parsed.GOOGLE_REDIRECT_URI) && !hasValue(parsed.PUBLIC_API_URL)) {
      issues.push('Gmail OAuth exige GOOGLE_REDIRECT_URI ou PUBLIC_API_URL.');
    }
    if (!hasValue(parsed.WEB_URL)) {
      issues.push('WEB_URL é obrigatório quando Gmail OAuth estiver habilitado.');
    }
  }

  const calendarConfigured = [
    parsed.GOOGLE_CALENDAR_REDIRECT_URI,
    parsed.GOOGLE_CALENDAR_WEBHOOK_URL,
  ].some(hasValue);
  if (calendarConfigured) {
    if (!hasValue(parsed.GOOGLE_CLIENT_ID) || !hasValue(parsed.GOOGLE_CLIENT_SECRET)) {
      issues.push('Google Calendar OAuth exige GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
    }
    if (!hasValue(parsed.GOOGLE_CALENDAR_WEBHOOK_URL)) {
      issues.push('GOOGLE_CALENDAR_WEBHOOK_URL é obrigatório quando Google Calendar estiver habilitado.');
    }
    if (!hasValue(parsed.GOOGLE_CALENDAR_REDIRECT_URI) && !hasValue(parsed.PUBLIC_API_URL)) {
      issues.push('Google Calendar OAuth exige GOOGLE_CALENDAR_REDIRECT_URI ou PUBLIC_API_URL.');
    }
    if (!hasValue(parsed.WEB_URL)) {
      issues.push('WEB_URL é obrigatório quando Google Calendar estiver habilitado.');
    }
  }

  const metaConfigured = [
    parsed.META_APP_ID,
    parsed.META_APP_SECRET,
    parsed.META_REDIRECT_URI,
  ].some(hasValue);
  if (metaConfigured) {
    if (!hasValue(parsed.META_APP_ID) || !hasValue(parsed.META_APP_SECRET)) {
      issues.push('Meta OAuth exige META_APP_ID e META_APP_SECRET.');
    }
    if (!hasValue(parsed.META_REDIRECT_URI) && !hasValue(parsed.PUBLIC_API_URL)) {
      issues.push('Meta OAuth exige META_REDIRECT_URI ou PUBLIC_API_URL.');
    }
    if (!hasValue(parsed.WEB_URL)) {
      issues.push('WEB_URL é obrigatório quando Meta OAuth estiver habilitado.');
    }
  }

  const metaWebhookConfigured = [
    parsed.WHATSAPP_TOKEN,
    parsed.WHATSAPP_PHONE_ID,
    parsed.META_VERIFY_TOKEN,
  ].some(hasValue);
  if (metaWebhookConfigured && isProductionLike && !hasValue(parsed.META_APP_SECRET)) {
    issues.push('META_APP_SECRET é obrigatório para validar assinatura de webhook Meta em produção/staging.');
  }

  if (hasValue(parsed.RECALL_API_KEY) && isProductionLike && !hasValue(parsed.RECALL_WEBHOOK_SECRET)) {
    issues.push('RECALL_WEBHOOK_SECRET é obrigatório quando Recall estiver habilitado em produção/staging.');
  }

  if (hasValue(parsed.EVOLUTION_API_URL) && hasValue(parsed.PUBLIC_API_URL) && isProductionLike && !hasValue(parsed.EVOLUTION_WEBHOOK_SECRET)) {
    issues.push('EVOLUTION_WEBHOOK_SECRET é obrigatório quando o webhook Evolution estiver exposto em produção/staging.');
  }

  if (hasValue(parsed.D4SIGN_TOKEN_API) && isProductionLike && !hasValue(parsed.D4SIGN_WEBHOOK_SECRET)) {
    issues.push('D4SIGN_WEBHOOK_SECRET é obrigatório quando D4Sign estiver configurado em produção/staging.');
  }

  if (isProductionLike && !hasValue(parsed.GATEWAY_SHARED_SECRET)) {
    issues.push('GATEWAY_SHARED_SECRET é obrigatório em produção/staging para proteger o webhook do publisher.');
  }

  if (issues.length) {
    throw new Error(`Configuração insegura de ambiente:\n- ${issues.join('\n- ')}`);
  }
}

validateSecureRuntimeConfig();

export const env = {
  ...parsed,
  CLAUDE_API_KEY: parsed.CLAUDE_API_KEY || parsed.ANTHROPIC_API_KEY,
};

export const enforcePrivilegedMfa = parsed.EDRO_ENFORCE_PRIVILEGED_MFA ?? false;

export { allowUnsafeLocalAuthHelpers, isProductionLike, portalLoginSecret };
