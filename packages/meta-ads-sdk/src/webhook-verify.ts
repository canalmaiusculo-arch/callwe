import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Valida assinatura X-Hub-Signature-256 do webhook do Meta.
 * Header: `sha256=<hex>`
 *
 * Importante: `rawBody` precisa ser a string exata recebida — re-serializar quebra a assinatura.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;

  const received = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;

  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
