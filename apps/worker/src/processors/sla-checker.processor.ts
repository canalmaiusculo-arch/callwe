import { Worker } from 'bullmq';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES } from '../queues.js';

export function startSlaCheckerWorker() {
  return new Worker(
    QUEUES.slaChecker,
    async () => {
      const policies = await prisma.slaPolicy.findMany({ where: { enabled: true } });
      for (const p of policies) {
        const cutoff = new Date(Date.now() - p.firstResponseMin * 60_000);
        const breaching = await prisma.lead.count({
          where: {
            subAccountId: p.subAccountId,
            status: 'new',
            createdAt: { lt: cutoff },
            firstContactAt: null,
            deletedAt: null,
          },
        });
        if (breaching > 0) {
          logger.warn({ subAccountId: p.subAccountId, breaching }, 'SLA breach');
          // TODO: notificar (email, realtime) e marcar audit log.
        }
      }
    },
    { connection },
  );
}
