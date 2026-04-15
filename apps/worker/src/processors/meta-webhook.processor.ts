import { Worker } from 'bullmq';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES, metaLeadgenQueue } from '../queues.js';

interface MetaWebhookJob {
  inboxId: string;
}

interface MetaInboxBody {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: { leadgen_id: string; page_id: string; form_id: string; ad_id?: string };
    }>;
  }>;
}

/**
 * Backup processor: caso a API tenha caído depois de gravar webhook_inbox
 * mas antes de enfileirar, este worker reprocessa entries não-processadas.
 */
export function startMetaWebhookWorker() {
  return new Worker<MetaWebhookJob>(
    'meta-webhook',
    async (job) => {
      const inbox = await prisma.webhookInbox.findUnique({ where: { id: job.data.inboxId } });
      if (!inbox || inbox.processedAt) return;
      const body = inbox.body as unknown as MetaInboxBody;

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== 'leadgen') continue;
          await metaLeadgenQueue.add('lead', {
            leadgenId: change.value.leadgen_id,
            pageId: change.value.page_id,
            formId: change.value.form_id,
          });
        }
      }

      await prisma.webhookInbox.update({
        where: { id: inbox.id },
        data: { processedAt: new Date() },
      });

      logger.info({ inboxId: inbox.id }, 'Meta webhook inbox processed');
    },
    { connection, concurrency: 5 },
  );
}
