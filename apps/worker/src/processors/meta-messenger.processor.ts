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

function resolveToken(credentials: unknown): string | undefined {
  const raw = credentials as Record<string, unknown>;
  const creds = isEncryptedPayload(raw)
    ? decryptJson<{ pageAccessToken?: string; userAccessToken?: string }>(raw)
    : (raw as { pageAccessToken?: string; userAccessToken?: string });
  return creds.pageAccessToken ?? creds.userAccessToken ?? env.META_SYSTEM_USER_TOKEN;
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

      const token = resolveToken(page.integration.credentials);
      const receivedAt = timestamp ? new Date(timestamp) : new Date();

      // Acha ou cria a conversa (única por página+psid).
      let conversation = await prisma.messengerConversation.findUnique({
        where: { pageId_psid: { pageId, psid } },
      });

      if (!conversation) {
        // Primeira mensagem: busca perfil e cria um lead pra entrar no funil.
        let contactName: string | undefined;
        let contactAvatar: string | undefined;
        if (token) {
          try {
            const res = await axios.get(
              `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${psid}`,
              { params: { access_token: token, fields: 'name,first_name,profile_pic' }, timeout: 10_000 },
            );
            contactName = res.data?.name ?? res.data?.first_name;
            contactAvatar = res.data?.profile_pic;
          } catch {
            // perfil pode não estar acessível — segue sem nome
          }
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
