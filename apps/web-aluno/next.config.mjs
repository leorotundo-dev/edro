import path from 'path';
import { fileURLToPath } from 'url';
import { withSentryConfig } from '@sentry/nextjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const workspaceAliases = {
  '@edro/theme': path.join(__dirname, '../../packages/theme'),
  '@edro/shared': path.join(__dirname, '../../packages/shared'),
  '@edro/ui': path.join(__dirname, '../../packages/ui'),
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@edro/shared', '@edro/ui'],
  env: {
    // Base deve ser o host raiz; as rotas ja incluem /api
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3333',
    NEXT_PUBLIC_SENTRY_DSN:
      process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '',
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...workspaceAliases,
    };
    return config;
  },
};

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: 'edro',
    project: 'edro-prod',
    errorHandler: (error) => {
      console.warn('[sentry] upload failed', error?.message || error);
    }
  },
  {
    hideSourcemaps: true,
    disableLogger: true,
  }
);
