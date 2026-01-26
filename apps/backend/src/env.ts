import 'dotenv/config';
import { z } from 'zod';

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
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
  ALLOWED_ORIGINS: z.string().optional(),
  EDRO_ALLOWED_DOMAINS: z.string().optional(),
  EDRO_ADMIN_EMAILS: z.string().optional(),
  EDRO_LOGIN_CODE_TTL_MINUTES: z.coerce.number().optional(),
  EDRO_LOGIN_ECHO_CODE: z.coerce.boolean().optional(),
  EDRO_LOGIN_SECRET: z.string().optional(),
  EDRO_ICLIPS_NOTIFY_EMAIL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export const env = envSchema.parse(process.env);
