import * as Sentry from '@sentry/node';

/**
 * Sentry must be initialized before any other module in the application is
 * imported, so its instrumentation can hook into Node's module loader for
 * automatic tracing (HTTP, Postgres, etc.). This file is imported as the
 * very first line of `main.ts` for exactly that reason — importing it later,
 * or importing application modules before it, silently loses coverage for
 * whatever loaded first.
 *
 * Deliberately a no-op (not a boot failure) when `SENTRY_DSN` is unset: this
 * keeps local development, CI, and any deployment that hasn't provisioned a
 * Sentry project working exactly as before, rather than making error
 * tracking a hard dependency of the application starting at all.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Conservative default: capture a sample of transactions for
    // performance monitoring rather than every single request, which would
    // add overhead and noise disproportionate to this application's traffic
    // volume. Tune upward only if performance monitoring is actively being
    // used to investigate something.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
