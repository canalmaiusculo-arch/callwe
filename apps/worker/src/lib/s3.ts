import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../env.js';

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return env.S3_PUBLIC_URL_BASE ? `${env.S3_PUBLIC_URL_BASE}/${key}` : `s3://${env.S3_BUCKET}/${key}`;
}
