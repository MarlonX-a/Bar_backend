const allowedEnvironments = ['development', 'test', 'production'] as const;

type Environment = (typeof allowedEnvironments)[number];

function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalString(
  config: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = config[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function positiveInteger(
  config: Record<string, unknown>,
  key: string,
  fallback?: number,
): number {
  const rawValue = config[key] ?? fallback;
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }

  return value;
}

function environment(config: Record<string, unknown>): Environment {
  const value = config.NODE_ENV ?? 'development';
  if (
    typeof value !== 'string' ||
    !allowedEnvironments.includes(value as Environment)
  ) {
    throw new Error(
      `NODE_ENV must be one of: ${allowedEnvironments.join(', ')}`,
    );
  }
  return value as Environment;
}

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv = environment(config);
  const jwtSecret = requiredString(config, 'JWT_SECRET');

  if (nodeEnv === 'production' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: positiveInteger(config, 'PORT', 3000),
    DB_HOST: requiredString(config, 'DB_HOST'),
    DB_PORT: positiveInteger(config, 'DB_PORT'),
    DB_USERNAME: requiredString(config, 'DB_USERNAME'),
    DB_PASSWORD: requiredString(config, 'DB_PASSWORD'),
    DB_NAME: requiredString(config, 'DB_NAME'),
    JWT_SECRET: jwtSecret,
    ACCESS_TOKEN_TTL_SECONDS: positiveInteger(config, 'ACCESS_TOKEN_TTL_SECONDS', 600),
    REFRESH_TOKEN_TTL_DAYS: positiveInteger(config, 'REFRESH_TOKEN_TTL_DAYS', 30),
    REFRESH_TOKEN_ABSOLUTE_DAYS: positiveInteger(config, 'REFRESH_TOKEN_ABSOLUTE_DAYS', 90),
    TABLE_SESSION_TTL_MINUTES: positiveInteger(config, 'TABLE_SESSION_TTL_MINUTES', 240),
    CORS_ORIGINS: optionalString(config, 'CORS_ORIGINS', 'http://localhost:3000'),
  };
}
