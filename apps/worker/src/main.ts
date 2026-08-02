import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN_WORKER) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_WORKER,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0.1,
  });
}

import { logger } from './lib/logger.js';
import { startCloudtalkWebhookWorker } from './processors/cloudtalk-webhook.processor.js';
import { startRecordingSyncWorker } from './processors/recording-sync.processor.js';
import { startTranscriptionWorker } from './processors/transcription.processor.js';
import { startMetaWebhookWorker } from './processors/meta-webhook.processor.js';
import { startMetaLeadgenWorker } from './processors/meta-leadgen.processor.js';
import { startMetaMessengerWorker } from './processors/meta-messenger.processor.js';
import { startAgentAttributionWorker } from './processors/agent-attribution.processor.js';
import { startSlaCheckerWorker } from './processors/sla-checker.processor.js';
import { startUsageAggregatorWorker } from './processors/usage-aggregator.processor.js';
import { scheduleRecurringJobs } from './scheduler.js';

async function main() {
  logger.info('🔧 CallWe worker starting...');

  startCloudtalkWebhookWorker();
  startMetaWebhookWorker();
  startRecordingSyncWorker();
  startTranscriptionWorker();
  startMetaLeadgenWorker();
  startMetaMessengerWorker();
  startAgentAttributionWorker();
  startSlaCheckerWorker();
  startUsageAggregatorWorker();

  await scheduleRecurringJobs();

  logger.info('✅ Worker ready');
}

main().catch((err) => {
  logger.error({ err }, 'Worker boot failed');
  Sentry.captureException(err);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    logger.info(`Received ${sig}, shutting down...`);
    process.exit(0);
  });
}
