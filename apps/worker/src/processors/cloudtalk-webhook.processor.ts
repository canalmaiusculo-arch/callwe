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

      const body = inbox.body as Record<string, unknown>;
      const eventType = inbox.eventType;
      const tag = (body.tags as string[] | undefined)?.find((t) => t.startsWith('sub:'));
      if (!tag) {
        await prisma.webhookInbox.update({
          where: { id: inbox.id },
          data: { processedAt: new Date(), processingError: 'no sub-account tag' },
        });
        return;
      }

      const subAccount = await prisma.subAccount.findUnique({ where: { cloudtalkTag: tag } });
      if (!subAccount) {
        await prisma.webhookInbox.update({
          where: { id: inbox.id },
          data: { processedAt: new Date(), processingError: 'unknown tag' },
        });
        return;
      }

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
  const callUuid = String(body.call_uuid);
  const phone = String(body.from_number ?? '');

  let leadId: string | undefined;
  if (phone) {
    const existing = await prisma.lead.findFirst({
      where: { subAccountId, phoneE164: phone, deletedAt: null },
    });
    if (existing) {
      leadId = existing.id;
    } else {
      const created = await prisma.lead.create({
        data: { subAccountId, source: 'inbound_call', phoneE164: phone },
      });
      leadId = created.id;
    }
  }

  await prisma.interaction.upsert({
    where: { cloudtalkCallId: callUuid },
    update: {
      status: mapCallStatus(body.event_type as string),
      endedAt: body.ended_at ? new Date(String(body.ended_at)) : null,
      durationSeconds: body.duration ? Number(body.duration) : null,
      metadata: body as object,
    },
    create: {
      subAccountId,
      leadId,
      cloudtalkCallId: callUuid,
      type: 'call',
      direction: body.type === 'outgoing' ? 'outbound' : 'inbound',
      status: mapCallStatus(body.event_type as string),
      startedAt: new Date(String(body.started_at ?? Date.now())),
      endedAt: body.ended_at ? new Date(String(body.ended_at)) : null,
      durationSeconds: body.duration ? Number(body.duration) : null,
      fromNumber: String(body.from_number ?? ''),
      toNumber: String(body.to_number ?? ''),
      metadata: body as object,
    },
  });
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
