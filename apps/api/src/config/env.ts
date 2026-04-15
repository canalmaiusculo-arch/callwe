import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 32 bytes hex (64 chars)'),

  CLOUDTALK_API_KEY_ID: z.string(),
  CLOUDTALK_API_KEY_SECRET: z.string(),
  CLOUDTALK_API_BASE_URL: z.string().url().default('https://api.cloudtalk.io/v1'),
  CLOUDTALK_PHONE_PARTNER_ID: z.string().optional(),
  CLOUDTALK_WEBHOOK_SECRET: z.string(),
  CLOUDTALK_CALLFLOW_CALLBACK_URL: z.string().url().optional(),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_GRAPH_VERSION: z.string().default('v20.0'),
  META_OAUTH_REDIRECT_URL: z.string().url().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  META_SYSTEM_USER_TOKEN: z.string().optional(),
  META_OAUTH_STATE_SECRET: z.string().min(32).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof schema>;
