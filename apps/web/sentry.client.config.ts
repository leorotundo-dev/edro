import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.02 : 1.0,
  replaysSessionSampleRate: 0.02,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: [
        process.env.NEXT_PUBLIC_API_URL || /^https?:\/\/localhost/,
      ],
    }),
    Sentry.replayIntegration(),
  ],
});
