import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CAMPUS_NAME: z.string().default('Malla Reddy Engineering College for Women'),
  CANTEEN_TIMEZONE: z.string().default('Asia/Kolkata'),
  CANTEEN_OPEN_TIME: z.string().default('09:00'),
  CANTEEN_CLOSE_TIME: z.string().default('16:00'),
  SUPABASE_URL: z.string().url().or(z.string().min(1)).default('http://localhost:54321'),
  SUPABASE_ANON_KEY: z.string().default('mock-anon-key-for-local-dev'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('mock-service-role-key-for-local-dev'),
  PAYMENT_PROVIDER: z.enum(['sandbox', 'razorpay']).default('sandbox'),
  PAYMENT_PROVIDER_KEY_ID: z.string().optional(),
  PAYMENT_PROVIDER_KEY_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
