import { z } from 'zod';

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function parseEnv<T extends z.ZodTypeAny>(schema: T, source = process.env): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment');
  }
  return result.data;
}
