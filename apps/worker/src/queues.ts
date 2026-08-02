import { Queue } from 'bullmq';
import { connection } from './lib/redis.js';

export const QUEUES = {
  cloudtalkWebhook: 'cloudtalk-webhook',
  metaWebhook: 'meta-webhook',
  metaLeadgen: 'meta-leadgen',
  metaMessenger: 'meta-messenger',
  recordingSync: 'recording-sync',
  transcription: 'transcription',
  slaChecker: 'sla-checker',
  usageAggregator: 'usage-aggregator',
  agentAttribution: 'agent-attribution',
} as const;

const defaults = {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
};

// Queues que dependem de APIs externas com latência variável ou rate limit
// (CloudTalk processando recording, OpenAI Whisper/Chat com limite por minuto).
// 30s base + exponencial → ~30s, 60s, 120s, 240s, 480s, 960s = ~30min total.
const slowExternalDefaults = {
  connection,
  defaultJobOptions: {
    attempts: 8,
    backoff: { type: 'exponential' as const, delay: 30000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
};

export const cloudtalkWebhookQueue = new Queue(QUEUES.cloudtalkWebhook, defaults);
export const metaLeadgenQueue = new Queue(QUEUES.metaLeadgen, defaults);
export const metaMessengerQueue = new Queue(QUEUES.metaMessenger, defaults);
export const recordingSyncQueue = new Queue(QUEUES.recordingSync, slowExternalDefaults);
export const transcriptionQueue = new Queue(QUEUES.transcription, slowExternalDefaults);
export const slaCheckerQueue = new Queue(QUEUES.slaChecker, defaults);
export const usageAggregatorQueue = new Queue(QUEUES.usageAggregator, defaults);
export const agentAttributionQueue = new Queue(QUEUES.agentAttribution, defaults);
