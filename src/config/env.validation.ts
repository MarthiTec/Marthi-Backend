import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEmail,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  development = 'development',
  test = 'test',
  production = 'production',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsNumberString()
  PORT = '8080';

  @IsString()
  API_PREFIX = 'api/v1';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsEmail()
  AUTH_DEV_EMAIL?: string;

  @IsOptional()
  @IsString()
  AUTH_DEV_PASSWORD?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsNumberString()
  BCRYPT_SALT_ROUNDS?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsBooleanString()
  SWAGGER_ENABLED?: string;
}

function omitBlank(config: Record<string, unknown>) {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        continue;
      }
      next[key] = trimmed;
      continue;
    }

    next[key] = value;
  }

  return next;
}

function formatEnvErrors(errors: ReturnType<typeof validateSync>) {
  return errors
    .flatMap((error) => Object.values(error.constraints ?? {}))
    .join('; ');
}

export function validateEnv(config: Record<string, unknown>) {
  const sanitized = omitBlank(config);
  const withAlias = {
    ...sanitized,
    JWT_SECRET:
      sanitized.JWT_SECRET ??
      sanitized.JWT_ACCESS_SECRET ??
      'marthi-dev-secret-change-me',
  };

  const validated = plainToInstance(EnvironmentVariables, withAlias, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${formatEnvErrors(errors)}`);
  }

  return validated;
}
