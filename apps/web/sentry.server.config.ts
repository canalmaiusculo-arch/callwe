import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN_WEB;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? 'production',
    tracesSampleRate: 0.1,
  });
}
