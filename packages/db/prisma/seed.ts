import { PrismaClient, MembershipRole, SubAccountPlan } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CallWe dev database...');

  const agency = await prisma.agency.upsert({
    where: { slug: 'demo-agency' },
    update: {},
    create: {
      name: 'Demo Agency',
      slug: 'demo-agency',
      billingEmail: 'billing@demo-agency.test',
    },
  });

  const sub = await prisma.subAccount.upsert({
    where: {
      agencyId_slug: { agencyId: agency.id, slug: 'clinica-x' },
    },
    update: {},
    create: {
      agencyId: agency.id,
      name: 'Clínica X',
      slug: 'clinica-x',
      cloudtalkTag: `sub:${randomUUID()}`,
      plan: SubAccountPlan.pro,
    },
  });

  // TODO: criar usuários quando o módulo de auth estiver pronto (argon2)
  console.log('Agency:', agency.slug);
  console.log('SubAccount:', sub.slug);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
