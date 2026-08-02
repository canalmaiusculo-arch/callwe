import { Worker } from 'bullmq';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES } from '../queues.js';
import { syncAgentAttribution } from '../lib/agent-attribution.js';

interface AttributionJob {
  // Janela em dias a olhar pra trás (recorrente). Ignorado se dateFrom/dateTo vierem.
  days?: number;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Atribui chamadas ao atendente via CDRs do CloudTalk. Roda de forma recorrente
 * (janela curta, pega o que chegou) e aceita janela explícita para backfill.
 */
export function startAgentAttributionWorker() {
  return new Worker<AttributionJob>(
    QUEUES.agentAttribution,
    async (job) => {
      const now = new Date();
      const dateTo = job.data.dateTo ? new Date(job.data.dateTo) : now;
      const dateFrom = job.data.dateFrom
        ? new Date(job.data.dateFrom)
        : new Date(now.getTime() - (job.data.days ?? 2) * 24 * 3600 * 1000);
      const r = await syncAgentAttribution({ dateFrom, dateTo });
      logger.info(r, 'Atribuição de atendente processada');
    },
    { connection, concurrency: 1 },
  );
}
