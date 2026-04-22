import { Worker } from 'bullmq';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES, recordingSyncQueue } from '../queues.js';

interface WebhookJob {
  inboxId: string;
}

export function startCloudtalkWebhookWorker() {
  return new Worker<WebhookJob>(
    QUEUES.cloudtalkWebhook,
    async (job) => {
      const inbox = await prisma.webhookInbox.findUnique({ where: { id: job.data.inboxId } });
      if (!inbox) throw new Error(`Inbox ${job.data.inboxId} not found`);

      const rawBody = inbox.body as Record<string, unknown>;
      const body = trimStrings(rawBody);
      const eventType = (inbox.eventType ?? '').trim();

      // CloudTalk envia internal_number e external_number.
      // Para chamadas inbound, internal = nosso número (cliente).
      // Para outbound, external = número discado (cliente).
      // Olhamos os dois e procuramos qual existe na tabela phone_numbers.
      const candidates = [
        normalizeE164(String(body.internal_number ?? body.to_number ?? '')),
        normalizeE164(String(body.external_number ?? body.from_number ?? '')),
      ].filter(Boolean);

      if (candidates.length === 0) {
        await prisma.webhookInbox.update({
          where: { id: inbox.id },
          data: { processedAt: new Date(), processingError: 'no phone number to resolve sub-account' },
        });
        return;
      }

      const phoneRecord = await prisma.phoneNumber.findFirst({
        where: { e164: { in: candidates }, status: 'active' },
        include: { subAccount: true },
      });

      if (!phoneRecord) {
        await prisma.webhookInbox.update({
          where: { id: inbox.id },
          data: { processedAt: new Date(), processingError: `unknown numbers: ${candidates.join(', ')}` },
        });
        return;
      }

      const subAccount = phoneRecord.subAccount;

      if (eventType === 'call.started' || eventType === 'call.ended' || eventType === 'call.missed') {
        await handleCallEvent(subAccount.id, body);
      } else if (eventType === 'recording.ready') {
        await handleRecordingReady(subAccount.id, body);
      } else if (eventType === 'sms.received' || eventType === 'sms.sent') {
        await handleSms(subAccount.id, body);
      } else if (eventType === 'voicemail.received') {
        await handleVoicemail(subAccount.id, body);
      } else {
        logger.warn({ eventType }, 'Unhandled CloudTalk event');
      }

      await prisma.webhookInbox.update({
        where: { id: inbox.id },
        data: { processedAt: new Date() },
      });
    },
    { connection, concurrency: 10 },
  );
}

async function handleCallEvent(subAccountId: string, body: Record<string, unknown>) {
  const callUuid = String(body.call_uuid ?? body.call_id);
  const direction = body.direction === 'outgoing' || body.type === 'outgoing' ? 'outbound' : 'inbound';
  const internalNumber = normalizeE164(String(body.internal_number ?? body.to_number ?? ''));
  const externalNumber = normalizeE164(String(body.external_number ?? body.from_number ?? ''));

  // Lead é sempre criado com base no número EXTERNO (cliente).
  const customerPhone = externalNumber;
  let leadId: string | undefined;
  if (customerPhone) {
    const existing = await prisma.lead.findFirst({
      where: { subAccountId, phoneE164: customerPhone, deletedAt: null },
    });
    if (existing) {
      leadId = existing.id;
    } else {
      const created = await prisma.lead.create({
        data: {
          subAccountId,
          source: direction === 'inbound' ? 'inbound_call' : 'outbound_call',
          phoneE164: customerPhone,
        },
      });
      leadId = created.id;
    }
  }

  const fromNumber = direction === 'inbound' ? externalNumber : internalNumber;
  const toNumber = direction === 'inbound' ? internalNumber : externalNumber;

  await prisma.interaction.upsert({
    where: { cloudtalkCallId: callUuid },
    update: {
      status: mapCallStatus(body.event_type as string),
      endedAt: body.ended_at ? new Date(String(body.ended_at)) : null,
      durationSeconds: body.duration ?? body.talking_time ? Number(body.duration ?? body.talking_time) : null,
      metadata: body as object,
    },
    create: {
      subAccountId,
      leadId,
      cloudtalkCallId: callUuid,
      type: 'call',
      direction,
      status: mapCallStatus(body.event_type as string),
      startedAt: new Date(String(body.started_at ?? Date.now())),
      endedAt: body.ended_at ? new Date(String(body.ended_at)) : null,
      durationSeconds: body.duration ?? body.talking_time ? Number(body.duration ?? body.talking_time) : null,
      fromNumber,
      toNumber,
      metadata: body as object,
    },
  });
}

function trimStrings(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const cleanKey = k.trim();
    out[cleanKey] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

function normalizeE164(num: string): string {
  if (!num) return '';
  const trimmed = num.trim();
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function mapCallStatus(event: string) {
  if (event === 'call.started') return 'ringing' as const;
  if (event === 'call.ended') return 'completed' as const;
  if (event === 'call.missed') return 'missed' as const;
  return 'initiated' as const;
}

async function handleRecordingReady(subAccountId: string, body: Record<string, unknown>) {
  const callUuid = String(body.call_uuid);
  const interaction = await prisma.interaction.findUnique({ where: { cloudtalkCallId: callUuid } });
  if (!interaction) return;
  await recordingSyncQueue.add('sync', {
    interactionId: interaction.id,
    cloudtalkRecordingUrl: String(body.recording_url ?? ''),
    subAccountId,
  });
}

async function handleSms(subAccountId: string, body: Record<string, unknown>) {
  await prisma.interaction.create({
    data: {
      subAccountId,
      cloudtalkSmsId: String(body.message_id),
      type: 'sms',
      direction: body.event_type === 'sms.sent' ? 'outbound' : 'inbound',
      status: 'completed',
      startedAt: new Date(String(body.received_at ?? Date.now())),
      fromNumber: String(body.from_number ?? ''),
      toNumber: String(body.to_number ?? ''),
      smsBody: String(body.body ?? ''),
      metadata: body as object,
    },
  });
}

async function handleVoicemail(subAccountId: string, body: Record<string, unknown>) {
  await prisma.interaction.create({
    data: {
      subAccountId,
      type: 'voicemail',
      direction: 'inbound',
      status: 'completed',
      startedAt: new Date(String(body.received_at ?? Date.now())),
      fromNumber: String(body.from_number ?? ''),
      toNumber: String(body.to_number ?? ''),
      recordingUrl: body.recording_url ? String(body.recording_url) : null,
      metadata: body as object,
    },
  });
}
