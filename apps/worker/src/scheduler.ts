import { slaCheckerQueue, usageAggregatorQueue, agentAttributionQueue } from './queues.js';
import { logger } from './lib/logger.js';

/**
 * Registra jobs recorrentes.
 * Chamado no boot do worker; BullMQ deduplica pela `jobId`.
 */
export async function scheduleRecurringJobs() {
  await slaCheckerQueue.add(
    'sla-check',
    {},
    {
      jobId: 'sla-checker-recurring',
      repeat: { pattern: '*/5 * * * *' }, // a cada 5 minutos
    },
  );

  await usageAggregatorQueue.add(
    'aggregate-usage',
    {},
    {
      jobId: 'usage-aggregator-recurring',
      repeat: { pattern: '0 3 * * *' }, // 03:00 UTC diariamente
    },
  );

  // Atribuição de atendente (CDRs do CloudTalk) — janela curta, forward.
  await agentAttributionQueue.add(
    'attribute',
    { days: 2 },
    {
      jobId: 'agent-attribution-recurring',
      repeat: { pattern: '*/20 * * * *' }, // a cada 20 minutos
    },
  );

  logger.info('Recurring jobs scheduled');
}
