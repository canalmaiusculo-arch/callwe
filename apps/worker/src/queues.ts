import { Queue } from 'bullmq';
import { connection } from './lib/redis.js';

export const QUEUES = {
  cloudtalkWebhook: 'cloudtalk-webhook',
  metaWebhook: 'meta-webhook',
  metaLeadgen: 'meta-leadgen',
  recordingSync: 'recording-sync',
  transcription: 'transcription',
  slaChecker: 'sla-checker',
  usageAggregator: 'usage-aggregator',
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

export const cloudtalkWebhookQueue = new Queue(QUEUES.cloudtalkWebhook, defaults);
export const metaLeadgenQueue = new Queue(QUEUES.metaLeadgen, defaults);
export const recordingSyncQueue = new Queue(QUEUES.recordingSync, defaults);
export const transcriptionQueue = new Queue(QUEUES.transcription, defaults);
export const slaCheckerQueue = new Queue(QUEUES.slaChecker, defaults);
export const usageAggregatorQueue = new Queue(QUEUES.usageAggregator, defaults);
