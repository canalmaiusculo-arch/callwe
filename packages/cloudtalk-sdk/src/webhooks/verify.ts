import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Valida assinatura HMAC-SHA256 do webhook CloudTalk.
 * CloudTalk envia header X-CloudTalk-Signature com formato "sha256=<hex>".
 *
 * IMPORTANTE: `rawBody` deve ser a string exata enviada pelo CloudTalk,
 * não o objeto já parseado (re-serializar altera bytes e quebra a assinatura).
 */
export function verifyCloudtalkSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const received = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
