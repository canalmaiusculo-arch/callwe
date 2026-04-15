import { Worker } from 'bullmq';
import axios from 'axios';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES } from '../queues.js';
import { env } from '../env.js';

interface LeadgenJob {
  leadgenId: string;
  pageId: string;
  formId: string;
}

/**
 * Webhook da Meta manda apenas leadgen_id — precisamos buscar
 * o lead completo via Graph API usando o token da página.
 */
export function startMetaLeadgenWorker() {
  return new Worker<LeadgenJob>(
    QUEUES.metaLeadgen,
    async (job) => {
      const { leadgenId, pageId, formId } = job.data;

      const form = await prisma.metaLeadForm.findFirst({
        where: { pageId, formId, enabled: true },
        include: { integration: true },
      });
      if (!form) {
        logger.warn({ pageId, formId }, 'No enabled MetaLeadForm');
        return;
      }

      const creds = form.integration.credentials as { pageAccessToken?: string };
      const token = creds.pageAccessToken ?? env.META_SYSTEM_USER_TOKEN;
      if (!token) throw new Error('No token to fetch leadgen');

      const res = await axios.get(
        `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${leadgenId}`,
        { params: { access_token: token, fields: 'field_data,created_time,ad_id,form_id' } },
      );

      const fields = (res.data.field_data as Array<{ name: string; values: string[] }>) ?? [];
      const byName: Record<string, string> = {};
      for (const f of fields) byName[f.name] = f.values?.[0] ?? '';

      const mapping = (form.fieldMapping as Record<string, string>) ?? {};
      const phone = byName[mapping.phone ?? 'phone_number'];
      const email = byName[mapping.email ?? 'email'];
      const name = byName[mapping.name ?? 'full_name'];

      await prisma.lead.create({
        data: {
          subAccountId: form.subAccountId,
          source: 'meta_ads',
          sourceRef: `fb_lead:${leadgenId}`,
          name: name || null,
          phoneE164: phone || null,
          email: email || null,
          customFields: byName,
        },
      });

      // TODO: emitir realtime via Redis pub/sub → API → socket.io
    },
    { connection, concurrency: 5 },
  );
}
