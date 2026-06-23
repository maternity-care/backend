import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsOptional()
  APP_NAME?: string;

  @IsString()
  @IsOptional()
  NODE_ENV?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_SALT_ROUNDS: number;

  @IsString()
  @IsOptional()
  STORAGE_DRIVER?: string;

  @IsString()
  @IsOptional()
  S3_BUCKET?: string;

  @IsString()
  @IsOptional()
  S3_REGION?: string;

  @IsString()
  @IsOptional()
  S3_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  S3_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  S3_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  CDN_BASE_URL?: string;

  @IsString()
  @IsOptional()
  S3_FORCE_PATH_STYLE?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  UPLOAD_MAX_FILE_SIZE_MB?: number;

  @IsString()
  @IsOptional()
  UPLOAD_ALLOWED_MIME_TYPES?: string;

  @IsInt()
  @Min(60)
  @Max(3600)
  @IsOptional()
  UPLOAD_PRESIGN_EXPIRES_IN?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
