import { Worker } from 'bullmq';
import { prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES } from '../queues.js';
import { env } from '../env.js';

interface TranscribeJob {
  interactionId: string;
}

/**
 * Preferimos puxar transcrição do CloudTalk AI (já pronta).
 * Fallback: Whisper (OpenAI) se configurado.
 */
export function startTranscriptionWorker() {
  return new Worker<TranscribeJob>(
    QUEUES.transcription,
    async (job) => {
      const { interactionId } = job.data;
      const interaction = await prisma.interaction.findUnique({ where: { id: interactionId } });
      if (!interaction?.recordingUrl) return;

      // TODO: buscar transcript do CloudTalk AI via API.
      // Se não vier (AI não habilitado na subconta), cair no Whisper.

      if (!env.OPENAI_API_KEY) {
        logger.debug({ interactionId }, 'No transcription provider configured');
        return;
      }

      // Placeholder: implementação real baixa o áudio, manda pro Whisper,
      // depois pede resumo/sentimento ao gpt-4o-mini e atualiza a interaction.
      logger.info({ interactionId }, 'Transcription queued (stub)');
    },
    { connection, concurrency: 2 },
  );
}
