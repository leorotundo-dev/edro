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
  RAILWAY_ACCOUNT_TOKEN: z.string().optional(),
  RAILWAY_PROJECT_ID: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ENABLE_WORKERS: z.string().optional()
});

export const env = envSchema.parse(process.env);
