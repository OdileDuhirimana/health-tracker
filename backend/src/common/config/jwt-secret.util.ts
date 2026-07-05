import { ConfigService } from '@nestjs/config';

/**
 * Single source of truth for resolving the JWT signing/verification secret.
 *
 * Why centralized: previously `AuthModule` (signing) and `JwtStrategy`
 * (verification) each computed their own fallback independently
 * ('dev-secret-change-me' vs the hardcoded 'your-secret-key'). Any drift
 * between those two fallbacks — or an environment where NODE_ENV isn't
 * exactly 'production' (e.g. a misconfigured staging/Render deploy) —
 * could silently downgrade token security to a guessable constant instead
 * of failing to start. Resolving the secret in one place guarantees the
 * signer and verifier always agree, and guarantees the same fail-hard rule
 * applies to both.
 *
 * Policy: JWT_SECRET is required whenever NODE_ENV is 'production' or
 * unset/anything other than 'development' or 'test'. Only local development
 * and automated tests may fall back to a well-known non-secret value, and
 * that value is intentionally obvious ('dev-secret-change-me') so it is
 * never mistaken for a real secret if it leaks into a deployed environment.
 */
export function resolveJwtSecret(configService: ConfigService): string {
  const nodeEnv = (configService.get<string>('NODE_ENV') || '').toLowerCase();
  const secret = configService.get<string>('JWT_SECRET');

  if (secret && secret.trim().length > 0) {
    return secret;
  }

  const isLocalOnly = nodeEnv === 'development' || nodeEnv === 'test';
  if (!isLocalOnly) {
    throw new Error(
      'JWT_SECRET must be set. Refusing to start with an implicit fallback secret outside development/test.',
    );
  }

  return 'dev-secret-change-me';
}
