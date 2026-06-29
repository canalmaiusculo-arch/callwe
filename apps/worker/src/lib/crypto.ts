import { createDecipheriv } from 'node:crypto';
import { env } from '../env.js';

// Espelho de apps/api/src/modules/integrations/crypto.ts — precisa usar o mesmo
// algoritmo e a MESMA ENCRYPTION_KEY para descriptografar as credenciais que a API gravou.
const ALGO = 'aes-256-gcm';

interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
  v: 1;
}

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes');
  }
  return key;
}

/** Retorna true se o objeto parece um payload criptografado ({iv,tag,data}). */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    'iv' in value &&
    'tag' in value &&
    'data' in value
  );
}

export function decryptJson<T = Record<string, unknown>>(payload: Record<string, unknown>): T {
  const p = payload as unknown as EncryptedPayload;
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(p.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(p.tag, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(p.data, 'base64')), decipher.final()]);
  return JSON.parse(dec.toString('utf8')) as T;
}
