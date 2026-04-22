import { Worker } from 'bullmq';
import axios from 'axios';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES, transcriptionQueue } from '../queues.js';
import { uploadBuffer } from '../lib/s3.js';
import { env } from '../env.js';

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
      logger.info({ interactionId, url: cloudtalkRecordingUrl }, 'Syncing recording');

      // CloudTalk pub URLs aceitam Basic auth com as mesmas credenciais da API.
      const res = await axios.get<ArrayBuffer>(cloudtalkRecordingUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: env.CLOUDTALK_API_KEY_ID,
          password: env.CLOUDTALK_API_KEY_SECRET,
        },
        timeout: 60_000,
        maxRedirects: 5,
      });

      const buffer = Buffer.from(res.data);
      const isWav = cloudtalkRecordingUrl.toLowerCase().includes('.wav');
      const ext = isWav ? 'wav' : 'mp3';
      const contentType = isWav ? 'audio/wav' : 'audio/mpeg';
      const key = `recordings/${subAccountId}/${interactionId}.${ext}`;
      const url = await uploadBuffer(key, buffer, contentType);

      await prisma.interaction.update({
        where: { id: interactionId },
        data: { recordingUrl: url, recordingSyncedAt: new Date() },
      });

      logger.info({ interactionId, url }, 'Recording synced');

      // Encadeia transcrição se configurado
      if (env.OPENAI_API_KEY) {
        await transcriptionQueue.add('transcribe', { interactionId });
      }
    },
    { connection, concurrency: 4 },
  );
}
