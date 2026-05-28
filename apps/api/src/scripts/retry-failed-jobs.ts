/**
 * Re-enfileira jobs falhados das queues recording-sync e transcription.
 * Útil depois de bumping retry config — pega os jobs que esgotaram
 * tentativas antes do fix e os roda de novo.
 *
 * Roda na VPS:
 *   docker compose -f /opt/callwe/infra/docker-compose.prod.yml exec api \
 *     tsx apps/api/dist/scripts/retry-failed-jobs.js
 */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAMES = ['recording-sync', 'transcription'] as const;

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not set');
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  for (const name of QUEUE_NAMES) {
    const q = new Queue(name, { connection });
    const failed = await q.getFailed(0, -1);
    console.log(`→ ${name}: ${failed.length} failed jobs`);
    let retried = 0;
    for (const job of failed) {
      try {
        await job.retry();
        retried++;
      } catch (err) {
        console.log(`  ⚠️ failed to retry ${job.id}: ${(err as Error).message}`);
      }
    }
    console.log(`  ✅ ${retried}/${failed.length} re-enqueued`);
    await q.close();
  }

  await connection.quit();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
