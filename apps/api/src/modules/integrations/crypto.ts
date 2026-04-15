import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes');
  }
  return key;
}

interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
  v: 1;
}

export function encryptJson(plain: Record<string, unknown>): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const json = Buffer.from(JSON.stringify(plain), 'utf8');
  const enc = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
    v: 1,
  };
}

export function decryptJson<T = Record<string, unknown>>(payload: Record<string, unknown>): T {
  const p = payload as unknown as EncryptedPayload;
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(p.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(p.tag, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(p.data, 'base64')), decipher.final()]);
  return JSON.parse(dec.toString('utf8')) as T;
}
