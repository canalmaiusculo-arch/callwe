import { Worker } from 'bullmq';
import axios from 'axios';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES } from '../queues.js';
import { env } from '../env.js';
import { decryptJson, isEncryptedPayload } from '../lib/crypto.js';

interface MessengerJob {
  pageId: string;
  psid: string;
  channel: 'messenger' | 'instagram';
  mid: string | null;
  text: string | null;
  attachments: unknown;
  timestamp: number;
}

type MetaCreds = { pageAccessToken?: string; userAccessToken?: string };

function decryptCreds(credentials: unknown): MetaCreds {
  const raw = credentials as Record<string, unknown>;
  return isEncryptedPayload(raw) ? decryptJson<MetaCreds>(raw) : (raw as MetaCreds);
}

/** Deriva um page access token a partir do user token (o page token pode estar vazio). */
async function getPageToken(pageId: string, userToken: string): Promise<string | undefined> {
  try {
    const res = await axios.get(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${pageId}`, {
      params: { access_token: userToken, fields: 'access_token' },
      timeout: 10_000,
    });
    return res.data?.access_token as string | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve o nome do contato pela API de Conversas da página (como o inbox nativo).
 * Funciona mesmo em modo dev, ao contrário do fetch direto do PSID (bloqueado).
 */
async function resolveContactName(pageId: string, pageToken: string, psid: string): Promise<string | undefined> {
  try {
    const res = await axios.get(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${pageId}/conversations`, {
      params: { access_token: pageToken, fields: 'participants', limit: 25 },
      timeout: 10_000,
    });
    for (const conv of (res.data?.data ?? []) as Array<{ participants?: { data?: Array<{ id: string; name?: string }> } }>) {
      const u = (conv.participants?.data ?? []).find((x) => x.id === psid);
      if (u?.name) return u.name;
    }
  } catch {
    // segue sem nome
  }
  return undefined;
}

/**
 * Processa mensagens recebidas do Messenger/Instagram: acha (ou cria) a conversa
 * e o lead, e grava a mensagem. Deduplica pelo `mid` da Meta.
 */
export function startMetaMessengerWorker() {
  return new Worker<MessengerJob>(
    QUEUES.metaMessenger,
    async (job) => {
      const { pageId, psid, channel, mid, text, attachments, timestamp } = job.data;

      const page = await prisma.messengerPage.findFirst({
        where: { pageId, enabled: true },
        include: { integration: true },
      });
      if (!page) {
        logger.warn({ pageId }, 'Mensagem para página sem Messenger habilitado — ignorada');
        return;
      }

      // Dedup: a Meta reentrega webhooks.
      if (mid) {
        const exists = await prisma.messengerMessage.findUnique({ where: { mid } });
        if (exists) return;
      }

      const receivedAt = timestamp ? new Date(timestamp) : new Date();

      // Acha ou cria a conversa (única por página+psid).
      let conversation = await prisma.messengerConversation.findUnique({
        where: { pageId_psid: { pageId, psid } },
      });

      if (!conversation) {
        // Primeira mensagem: resolve o nome do contato (via API de Conversas) e cria o lead.
        let contactName: string | undefined;
        const contactAvatar: string | undefined = undefined;
        const creds = decryptCreds(page.integration.credentials);
        const pageToken = creds.pageAccessToken || (creds.userAccessToken ? await getPageToken(pageId, creds.userAccessToken) : undefined);
        if (pageToken) {
          contactName = await resolveContactName(pageId, pageToken, psid);
        }

        const lead = await prisma.lead.create({
          data: {
            subAccountId: page.subAccountId,
            source: 'messenger',
            sourceRef: `${channel}:${pageId}:${psid}`,
            name: contactName ?? null,
            customFields: { channel, pageId, psid },
          },
        });

        conversation = await prisma.messengerConversation.create({
          data: {
            subAccountId: page.subAccountId,
            pageId,
            psid,
            channel,
            leadId: lead.id,
            contactName: contactName ?? null,
            contactAvatar: contactAvatar ?? null,
          },
        });
      }

      const preview = text ?? '[anexo]';
      await prisma.messengerMessage.create({
        data: {
          conversationId: conversation.id,
          mid: mid ?? undefined,
          direction: 'inbound',
          text: text ?? null,
          attachments: (attachments as object) ?? undefined,
          createdAt: receivedAt,
        },
      });

      await prisma.messengerConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: receivedAt,
          lastMessageText: preview.slice(0, 200),
          lastInboundAt: receivedAt,
          status: 'open',
        },
      });

      logger.info({ pageId, psid, conversationId: conversation.id }, 'Mensagem Messenger recebida');
    },
    { connection, concurrency: 5 },
  );
}
