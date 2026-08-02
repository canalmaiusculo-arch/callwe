import { prisma } from '@callwe/db';
import { cloudtalk } from './cloudtalk.js';
import { logger } from './logger.js';

// A resposta do CloudTalk aninha o agente e o CDR em objetos separados; o SDK
// só devolve o Cdr (sem uuid nem agente). Aqui buscamos cru pra ter os dois.
interface RawCdrItem {
  Cdr?: {
    id?: string;
    type?: string;
    public_external?: string;
    public_internal?: string;
    started_at?: string;
    talking_time?: string;
  };
  Agent?: { id?: string | number | null };
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Atribui chamadas ao atendente que atendeu, usando os CDRs da API do CloudTalk.
 * O CDR não traz o UUID da nossa interação, então casamos por telefone externo +
 * horário (janela curta). O agente vem em Agent.id → usuário via
 * membership.cloudtalkAgentId. Idempotente (só preenche agentUserId nulo).
 */
export async function syncAgentAttribution(opts: {
  dateFrom: Date;
  dateTo: Date;
}): Promise<{ scanned: number; withAgent: number; updated: number }> {
  const memberships = await prisma.membership.findMany({
    where: { cloudtalkAgentId: { not: null } },
    select: { cloudtalkAgentId: true, userId: true },
  });
  const agentToUser = new Map<string, string>();
  for (const m of memberships) {
    if (m.cloudtalkAgentId) agentToUser.set(String(m.cloudtalkAgentId), m.userId);
  }
  if (agentToUser.size === 0) {
    logger.warn('Nenhuma membership com cloudtalkAgentId — atribuição não tem como mapear');
    return { scanned: 0, withAgent: 0, updated: 0 };
  }

  let page = 1;
  let scanned = 0;
  let withAgent = 0;
  let updated = 0;
  const WINDOW_MS = 90_000;

  for (;;) {
    const res = await cloudtalk.http.get('/calls/index.json', {
      params: { date_from: fmt(opts.dateFrom), date_to: fmt(opts.dateTo), limit: 1000, page },
    });
    const items: RawCdrItem[] = res.data?.responseData?.data ?? [];
    if (items.length === 0) break;
    scanned += items.length;

    for (const item of items) {
      const agentId = item.Agent?.id;
      const cdr = item.Cdr;
      if (!agentId || !cdr?.started_at) continue;
      const userId = agentToUser.get(String(agentId));
      if (!userId) continue;
      withAgent += 1;

      const external = cdr.public_external ?? undefined;
      if (!external) continue;
      const at = new Date(cdr.started_at);
      const from = new Date(at.getTime() - WINDOW_MS);
      const to = new Date(at.getTime() + WINDOW_MS);

      // Casa por telefone externo + janela de tempo; só preenche o que está sem dono.
      const result = await prisma.interaction.updateMany({
        where: {
          type: 'call',
          agentUserId: null,
          startedAt: { gte: from, lte: to },
          OR: [{ fromNumber: external }, { toNumber: external }],
        },
        data: { agentUserId: userId },
      });
      updated += result.count;
    }

    if (items.length < 1000) break;
    page += 1;
    if (page > 200) break;
  }

  logger.info(
    { scanned, withAgent, updated, dateFrom: fmt(opts.dateFrom), dateTo: fmt(opts.dateTo) },
    'Sync de atribuição de atendente concluído',
  );
  return { scanned, withAgent, updated };
}
