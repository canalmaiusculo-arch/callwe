import { Worker } from 'bullmq';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES } from '../queues.js';

export function startUsageAggregatorWorker() {
  return new Worker(
    QUEUES.usageAggregator,
    async () => {
      const now = new Date();
      const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const grouped = await prisma.interaction.groupBy({
        by: ['subAccountId', 'type', 'direction'],
        where: { startedAt: { gte: periodStart } },
        _sum: { durationSeconds: true },
        _count: { _all: true },
      });

      const bySub: Record<string, { in: number; out: number; sms: number }> = {};
      for (const g of grouped) {
        const bucket = (bySub[g.subAccountId] ??= { in: 0, out: 0, sms: 0 });
        if (g.type === 'call') {
          const minutes = Math.ceil((g._sum.durationSeconds ?? 0) / 60);
          if (g.direction === 'inbound') bucket.in += minutes;
          else bucket.out += minutes;
        }
        if (g.type === 'sms') bucket.sms += g._count._all;
      }

      for (const [subAccountId, agg] of Object.entries(bySub)) {
        await prisma.usageCounter.upsert({
          where: { subAccountId_period: { subAccountId, period: periodStart } },
          update: { inboundMinutes: agg.in, outboundMinutes: agg.out, smsCount: agg.sms },
          create: {
            subAccountId,
            period: periodStart,
            inboundMinutes: agg.in,
            outboundMinutes: agg.out,
            smsCount: agg.sms,
          },
        });
      }

      logger.info({ subAccounts: Object.keys(bySub).length }, 'Usage aggregated');
    },
    { connection },
  );
}
