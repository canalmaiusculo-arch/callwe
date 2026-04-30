/**
 * Sincroniza agents do CloudTalk → memberships.cloudtalk_agent_id (CallWe).
 *
 * Para cada agent retornado pelo CloudTalk, encontra o user CallWe pelo
 * email e popula TODAS as memberships dele (role=agent) com o
 * cloudtalk_agent_id correspondente. Sem isso o sendSms falha porque
 * não consegue resolver o agent_id pra mandar SMS via CloudTalk SDK.
 *
 * Roda na VPS:
 *   docker compose -f /opt/callwe/infra/docker-compose.prod.yml exec api \
 *     tsx apps/api/dist/scripts/sync-cloudtalk-agents.js
 *
 * Idempotente — pode rodar várias vezes.
 */
import { prisma } from '@callwe/db';
import { CloudtalkClient } from '@callwe/cloudtalk-sdk';

async function main() {
  const client = new CloudtalkClient({
    keyId: process.env.CLOUDTALK_API_KEY_ID!,
    keySecret: process.env.CLOUDTALK_API_KEY_SECRET!,
    baseUrl: process.env.CLOUDTALK_API_BASE_URL,
  });

  console.log('→ Fetching agents from CloudTalk...');
  const agents = await client.agents.list({ limit: 200 });
  console.log(`  Got ${agents.length} agents.\n`);

  let mappedUsers = 0;
  let updatedMemberships = 0;
  let unmatched = 0;

  for (const agent of agents) {
    const email = (agent.email ?? '').trim().toLowerCase();
    if (!email) {
      console.log(`⚠️  Agent #${agent.id} sem email — SKIP`);
      unmatched++;
      continue;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`⚠️  Agent ${email} (#${agent.id}) sem user CallWe correspondente — SKIP`);
      unmatched++;
      continue;
    }

    mappedUsers++;
    const cloudtalkAgentId = String(agent.id);

    const upd = await prisma.membership.updateMany({
      where: { userId: user.id, role: 'agent' },
      data: { cloudtalkAgentId },
    });
    updatedMemberships += upd.count;
    console.log(`✅ ${email} → cloudtalk_agent_id=${cloudtalkAgentId} (memberships: ${upd.count})`);
  }

  console.log('\n============== SUMMARY ==============');
  console.log(`Agents do CloudTalk:       ${agents.length}`);
  console.log(`Users mapeados:            ${mappedUsers}`);
  console.log(`Memberships atualizadas:   ${updatedMemberships}`);
  console.log(`Sem match:                 ${unmatched}`);
  console.log('=====================================');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  await prisma.$disconnect();
  process.exit(1);
});
