import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../config/env.js';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

const defaults = {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
};

export const CLOUDTALK_WEBHOOK_QUEUE = 'cloudtalk-webhook';
export const META_WEBHOOK_QUEUE = 'meta-webhook';
export const META_LEADGEN_QUEUE = 'meta-leadgen';
export const META_MESSENGER_QUEUE = 'meta-messenger';

const cloudtalkWebhookQueue = new Queue(CLOUDTALK_WEBHOOK_QUEUE, defaults);
const metaWebhookQueue = new Queue(META_WEBHOOK_QUEUE, defaults);
const metaLeadgenQueue = new Queue(META_LEADGEN_QUEUE, defaults);
const metaMessengerQueue = new Queue(META_MESSENGER_QUEUE, defaults);

@Global()
@Module({
  providers: [
    { provide: 'CLOUDTALK_WEBHOOK_QUEUE', useValue: cloudtalkWebhookQueue },
    { provide: 'META_WEBHOOK_QUEUE', useValue: metaWebhookQueue },
    { provide: 'META_LEADGEN_QUEUE', useValue: metaLeadgenQueue },
    { provide: 'META_MESSENGER_QUEUE', useValue: metaMessengerQueue },
  ],
  exports: [
    'CLOUDTALK_WEBHOOK_QUEUE',
    'META_WEBHOOK_QUEUE',
    'META_LEADGEN_QUEUE',
    'META_MESSENGER_QUEUE',
  ],
})
export class QueuesModule {}
