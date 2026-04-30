/**
 * Reprocessa webhooks que falharam com "unknown numbers" no inbox.
 * Útil depois de cadastrar phone_numbers que estavam faltando.
 *
 * Roda na VPS:
 *   docker compose -f /opt/callwe/infra/docker-compose.prod.yml exec api \
 *     tsx apps/api/dist/scripts/reprocess-failed-webhooks.js
 *
 * Estratégia: limpa processed_at + processing_error e re-enfileira no
 * BullMQ. Worker processa de novo (idempotente — calls usam upsert,
 * SMS verifica unique cloudtalkSmsId).
 */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@callwe/db';

async function main() {
  // Pega tudo que não foi processado com sucesso:
  //   (a) com processing_error setado (qualquer erro)
  //   (b) stuck — processed_at NULL e processing_error NULL (worker deu throw e
  //       BullMQ jogou em failed depois de 5 retries; webhook_inbox ficou orfão)
  const candidates = await prisma.webhookInbox.findMany({
    where: {
      provider: 'cloudtalk',
      OR: [
        { processingError: { not: null } },
        { AND: [{ processedAt: null }, { processingError: null }] },
      ],
    },
    select: { id: true, eventType: true, receivedAt: true },
    orderBy: { receivedAt: 'asc' },
  });

  console.log(`Found ${candidates.length} webhook(s) to reprocess.\n`);
  if (candidates.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not set');
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue('cloudtalk-webhook', { connection });

  let enqueued = 0;
  for (const inbox of candidates) {
    await prisma.webhookInbox.update({
      where: { id: inbox.id },
      data: { processedAt: null, processingError: null },
    });
    await queue.add('process', { inboxId: inbox.id });
    enqueued++;
    const eventType = (inbox.eventType ?? '').trim();
    console.log(`↺ Re-enqueued ${inbox.id} (${eventType}) [${inbox.receivedAt.toISOString()}]`);
  }

  console.log(`\n✅ Re-enqueued ${enqueued} webhook(s). Worker will process them shortly.`);
  console.log('   Monitor logs with:');
  console.log('   docker compose -f /opt/callwe/infra/docker-compose.prod.yml logs -f worker');

  await queue.close();
  await connection.quit();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  await prisma.$disconnect();
  process.exit(1);
});
