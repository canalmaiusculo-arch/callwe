import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  CLOUDTALK_API_KEY_ID: z.string(),
  CLOUDTALK_API_KEY_SECRET: z.string(),
  CLOUDTALK_API_BASE_URL: z.string().url().default('https://api.cloudtalk.io/v1'),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_PUBLIC_URL_BASE: z.string().url().optional(),

  META_GRAPH_VERSION: z.string().default('v20.0'),
  META_SYSTEM_USER_TOKEN: z.string().optional(),
  // Mesma chave da API — usada para descriptografar as credenciais das integrações.
  ENCRYPTION_KEY: z.string(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default('whisper-1'),
  OPENAI_SUMMARY_MODEL: z.string().default('gpt-4o-mini'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid worker env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
