import { Worker } from 'bullmq';
import axios from 'axios';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES, transcriptionQueue } from '../queues.js';
import { uploadBuffer } from '../lib/s3.js';

interface RecordingJob {
  interactionId: string;
  cloudtalkRecordingUrl: string;
  subAccountId: string;
}

export function startRecordingSyncWorker() {
  return new Worker<RecordingJob>(
    QUEUES.recordingSync,
    async (job) => {
      const { interactionId, cloudtalkRecordingUrl, subAccountId } = job.data;
      logger.info({ interactionId }, 'Syncing recording');

      const res = await axios.get<ArrayBuffer>(cloudtalkRecordingUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(res.data);
      const key = `recordings/${subAccountId}/${interactionId}.mp3`;
      const url = await uploadBuffer(key, buffer, 'audio/mpeg');

      await prisma.interaction.update({
        where: { id: interactionId },
        data: { recordingUrl: url, recordingSyncedAt: new Date() },
      });

      await transcriptionQueue.add('transcribe', { interactionId });
    },
    { connection, concurrency: 4 },
  );
}
