import { Worker } from 'bullmq';
import axios from 'axios';
import FormData from 'form-data';
import { prisma } from '@callwe/db';
import type { Prisma } from '@callwe/db';
import { connection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QUEUES } from '../queues.js';
import { env } from '../env.js';
import { s3 } from '../lib/s3.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';

interface TranscribeJob {
  interactionId: string;
}

export function startTranscriptionWorker() {
  return new Worker<TranscribeJob>(
    QUEUES.transcription,
    async (job) => {
      const { interactionId } = job.data;
      if (!env.OPENAI_API_KEY) {
        logger.debug({ interactionId }, 'OPENAI_API_KEY não configurada — skip');
        return;
      }

      const interaction = await prisma.interaction.findUnique({ where: { id: interactionId } });
      if (!interaction?.recordingUrl) return;
      if (interaction.transcript && interaction.aiSummary) {
        logger.info({ interactionId }, 'Já transcrito, pulando');
        return;
      }

      // 1. Baixa áudio (do R2 se já sincronizado, ou CloudTalk)
      const audioBuffer = await downloadRecording(interaction.recordingUrl);

      // 2. Whisper transcreve
      const transcript = await transcribe(audioBuffer, interaction.id);
      logger.info({ interactionId, transcriptLength: transcript.length }, 'Transcription done');

      // 3. GPT-4o-mini analisa qualidade + sentimento + resumo
      const analysis = await analyzeQuality(transcript);

      await prisma.interaction.update({
        where: { id: interactionId },
        data: {
          transcript,
          transcriptProvider: 'whisper',
          aiSummary: analysis.summary,
          sentiment: analysis.sentiment,
          aiScore: analysis.score,
          aiTopics: analysis.topics,
        },
      });

      logger.info({ interactionId, sentiment: analysis.sentiment, score: analysis.score }, 'AI analysis done');
    },
    { connection, concurrency: 2 },
  );
}

async function downloadRecording(url: string): Promise<Buffer> {
  const isR2 =
    !!env.S3_BUCKET &&
    (url.includes('.r2.cloudflarestorage.com') || url.includes(env.S3_BUCKET));

  if (isR2) {
    const u = new URL(url);
    let key = u.pathname.replace(/^\//, '');
    if (env.S3_BUCKET && key.startsWith(env.S3_BUCKET + '/')) {
      key = key.substring(env.S3_BUCKET.length + 1);
    }
    const obj = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    const chunks: Buffer[] = [];
    const stream = obj.Body as Readable;
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  const res = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    auth: {
      username: env.CLOUDTALK_API_KEY_ID,
      password: env.CLOUDTALK_API_KEY_SECRET,
    },
    timeout: 60_000,
  });
  return Buffer.from(res.data);
}

async function transcribe(buffer: Buffer, interactionId: string): Promise<string> {
  const form = new FormData();
  form.append('file', buffer, { filename: `${interactionId}.wav`, contentType: 'audio/wav' });
  form.append('model', env.OPENAI_TRANSCRIPTION_MODEL);
  form.append('language', 'pt');

  const res = await axios.post<{ text: string }>(
    'https://api.openai.com/v1/audio/transcriptions',
    form,
    {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120_000,
    },
  );
  return res.data.text;
}

interface Analysis {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // 0-100
  topics: string[];
}

async function analyzeQuality(transcript: string): Promise<Analysis> {
  const prompt = `Você analisa qualidade de atendimento telefônico em português brasileiro.
Dada a transcrição abaixo (pode ter falhas), retorne JSON com:
- summary: resumo da conversa em 2-3 frases, destacando o principal pedido do cliente e o que o atendente resolveu
- sentiment: "positive" | "neutral" | "negative" (do cliente)
- score: nota do atendimento de 0 a 100, considerando: clareza, empatia, resolução, objeções tratadas, fechamento
- topics: array de 1-5 tópicos mencionados (ex: "preço", "dúvida técnica", "cancelamento")

Responda APENAS com o JSON, sem markdown.

TRANSCRIÇÃO:
${transcript.substring(0, 8000)}`;

  const res = await axios.post<{ choices: Array<{ message: { content: string } }> }>(
    'https://api.openai.com/v1/chat/completions',
    {
      model: env.OPENAI_SUMMARY_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60_000,
    },
  );

  const content = res.data.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content);
  return {
    summary: String(parsed.summary ?? ''),
    sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
    score: Math.max(0, Math.min(100, Number(parsed.score ?? 50))),
    topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5).map(String) : [],
  };
}
