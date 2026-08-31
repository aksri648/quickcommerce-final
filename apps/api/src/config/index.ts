import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/quickcommerce?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long').default('quickcommerce-super-secret-jwt-dev-key-32chars!'),
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  B2_APPLICATION_KEY_ID: z.string().optional(),
  B2_APPLICATION_KEY: z.string().optional(),
  B2_BUCKET_NAME: z.string().optional(),
  OTP_SECRET_SALT: z.string().default('dev-otp-salt-quickcommerce-2026'),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(60),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
}).refine(data => {
  if (data.NODE_ENV === 'production' && data.JWT_SECRET === 'quickcommerce-super-secret-jwt-dev-key-32chars!') {
    return false;
  }
  return true;
}, { message: "Cannot use default JWT_SECRET in production" });

const parsed = ConfigSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Environment configuration validation failed');
}

export const config = parsed.data;
