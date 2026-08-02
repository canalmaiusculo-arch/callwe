import { cloudtalk } from './cloudtalk.js';
import { prisma } from '@callwe/db';
import { logger } from './logger.js';

interface CachedAgent {
  email: string;
  userId: string | null;
  cachedAt: number;
}

const cache = new Map<string, CachedAgent>();
const TTL_MS = 60 * 60 * 1000; // 1h

export async function resolveUserIdByCloudtalkAgent(agentId: string | number): Promise<string | null> {
  const key = String(agentId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAt < TTL_MS) {
    return cached.userId;
  }

  try {
    // 1) Link confiável: membership.cloudtalkAgentId -> userId.
    const membership = await prisma.membership.findFirst({
      where: { cloudtalkAgentId: key },
      select: { userId: true },
    });
    if (membership) {
      cache.set(key, { email: '', userId: membership.userId, cachedAt: Date.now() });
      return membership.userId;
    }

    // 2) Fallback: email do agente no CloudTalk -> user CallWe.
    const res = await cloudtalk.http.get(`/agents/show/${key}.json`);
    const email = String(res.data?.responseData?.Agent?.email ?? '').toLowerCase();
    if (!email) {
      cache.set(key, { email: '', userId: null, cachedAt: Date.now() });
      return null;
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const entry: CachedAgent = { email, userId: user?.id ?? null, cachedAt: Date.now() };
    cache.set(key, entry);
    return entry.userId;
  } catch (err) {
    logger.warn({ agentId, err: String(err) }, 'Failed to resolve CloudTalk agent to CallWe user');
    return null;
  }
}
