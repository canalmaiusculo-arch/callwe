import { prisma } from '@callwe/db';
import { cloudtalk } from './cloudtalk.js';
import { logger } from './logger.js';

function fmt(d: Date): string {
  // CloudTalk aceita 'YYYY-MM-DD HH:mm:ss'.
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Atribui as interações de chamada ao atendente que atendeu, usando os CDRs da
 * API do CloudTalk (o webhook não traz o agente). Mapeia agent_id do CloudTalk
 * -> usuário CallWe via membership.cloudtalkAgentId. Idempotente: só preenche
 * interações ainda sem agentUserId.
 */
export async function syncAgentAttribution(opts: {
  dateFrom: Date;
  dateTo: Date;
}): Promise<{ scanned: number; updated: number }> {
  // Mapa agentId (CloudTalk) -> userId (CallWe).
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
    return { scanned: 0, updated: 0 };
  }

  let page = 1;
  let scanned = 0;
  let updated = 0;
  const dateFrom = fmt(opts.dateFrom);
  const dateTo = fmt(opts.dateTo);

  for (;;) {
    const cdrs = await cloudtalk.calls.list({ date_from: dateFrom, date_to: dateTo, limit: 1000, page });
    if (!cdrs.length) break;
    scanned += cdrs.length;

    for (const cdr of cdrs) {
      if (!cdr.agent_id || !cdr.uuid) continue;
      const userId = agentToUser.get(String(cdr.agent_id));
      if (!userId) continue;
      const res = await prisma.interaction.updateMany({
        where: { cloudtalkCallId: cdr.uuid, agentUserId: null },
        data: { agentUserId: userId },
      });
      updated += res.count;
    }

    if (cdrs.length < 1000) break;
    page += 1;
    if (page > 200) break; // trava de segurança
  }

  logger.info({ scanned, updated, dateFrom, dateTo }, 'Sync de atribuição de atendente concluído');
  return { scanned, updated };
}
