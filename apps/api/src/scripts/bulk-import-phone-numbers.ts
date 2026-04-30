/**
 * Bulk import de phone_numbers + criação de sub_accounts faltantes.
 *
 * Roda na VPS:
 *   docker compose -f /opt/callwe/infra/docker-compose.prod.yml exec api \
 *     node dist/scripts/bulk-import-phone-numbers.js
 *
 * Idempotente: pula números já cadastrados e sub_accounts já criadas.
 */
import { randomUUID } from 'node:crypto';
import { prisma } from '@callwe/db';
import type { SubAccount } from '@callwe/db';
import { CloudtalkClient } from '@callwe/cloudtalk-sdk';

const AGENCY_ID = '1868a127-4fc6-4878-aa21-5158d758204a';

interface Mapping {
  cliente: string;
  e164: string;
}

const NUMBERS: Mapping[] = [
  { cliente: 'Hard Top Wood', e164: '+16124412527' },
  { cliente: 'SDR RK', e164: '+16453006342' },
  { cliente: 'Silva Super Clean', e164: '+14012934741' },
  { cliente: 'SDR RK', e164: '+15186854216' },
  { cliente: 'SDR RK', e164: '+12153925650' },
  { cliente: 'FA Cleaning', e164: '+16096762189' },
  { cliente: 'SDR RK', e164: '+18574122688' },
  { cliente: 'SDR RK', e164: '+12036938381' },
  { cliente: 'SDR RK', e164: '+17702703233' },
  { cliente: 'Elyon Cleaning', e164: '+18545042649' },
  { cliente: 'Leo Premier', e164: '+18542394067' },
  { cliente: 'SDR RK', e164: '+12019692304' },
  { cliente: 'Dan Moris', e164: '+12157742234' },
  { cliente: 'Melo General', e164: '+14842915449' },
  { cliente: 'Five Stars Cleaning', e164: '+14258422748' },
  { cliente: 'Borezzo Builds LLC', e164: '+18542216029' },
  { cliente: 'Almondes Construction', e164: '+17743104745' },
  { cliente: 'Tile e Stone', e164: '+15512829044' },
  { cliente: 'Anna Santos', e164: '+17246095909' },
  { cliente: 'AC Home Painting', e164: '+15084404225' },
  { cliente: 'AB Construction', e164: '+18483750785' },
  { cliente: 'Blessed Home', e164: '+14752656026' },
  { cliente: 'JC Cleaning', e164: '+14709999190' },
  { cliente: 'Zentari LLC', e164: '+14694024879' },
  { cliente: 'Color Splash Painting LLC', e164: '+14252875931' },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeE164(num: string): string {
  if (!num) return '';
  const digits = num.trim().replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function findMatchingSub(name: string, subs: SubAccount[]): SubAccount | null {
  const target = normalize(name);
  for (const s of subs) {
    if (normalize(s.name) === target) return s;
  }
  for (const s of subs) {
    const c = normalize(s.name);
    if (target.length >= 4 && c.length >= 4 && (target.includes(c) || c.includes(target))) {
      return s;
    }
  }
  return null;
}

interface CloudtalkNumber {
  id: string;
  e164: string;
  countryCode: string | null;
  internalName: string | null;
}

async function fetchCloudtalkNumbers(): Promise<CloudtalkNumber[]> {
  const client = new CloudtalkClient({
    keyId: process.env.CLOUDTALK_API_KEY_ID!,
    keySecret: process.env.CLOUDTALK_API_KEY_SECRET!,
    baseUrl: process.env.CLOUDTALK_API_BASE_URL,
  });
  const out: CloudtalkNumber[] = [];
  let page = 1;
  while (true) {
    const res = await client.http.get('/numbers/index.json', { params: { limit: 200, page } });
    type Item = {
      CallNumber: { id: string; caller_id_e164: string; country_code?: string; internal_name?: string };
    };
    const items = (res.data?.responseData?.data ?? []) as Item[];
    if (items.length === 0) break;
    for (const it of items) {
      out.push({
        id: it.CallNumber.id,
        e164: normalizeE164(it.CallNumber.caller_id_e164),
        countryCode: it.CallNumber.country_code ?? null,
        internalName: it.CallNumber.internal_name ?? null,
      });
    }
    if (items.length < 200) break;
    page++;
  }
  return out;
}

async function main() {
  console.log('→ Fetching phone numbers from CloudTalk...');
  const ctNumbers = await fetchCloudtalkNumbers();
  console.log(`  Got ${ctNumbers.length} numbers from CloudTalk.\n`);

  console.log('→ Loading existing sub_accounts...');
  const subs = await prisma.subAccount.findMany({ where: { agencyId: AGENCY_ID } });
  console.log(`  Found ${subs.length} sub_accounts in agency ${AGENCY_ID}.\n`);

  let createdSubs = 0;
  let createdNumbers = 0;
  let skippedNumbers = 0;
  let missingInCloudtalk = 0;

  for (const item of NUMBERS) {
    let sub = findMatchingSub(item.cliente, subs);
    if (!sub) {
      sub = await prisma.subAccount.create({
        data: {
          agencyId: AGENCY_ID,
          name: item.cliente,
          slug: slugify(item.cliente),
          cloudtalkTag: `sub:${randomUUID()}`,
          status: 'active',
          plan: 'starter',
        },
      });
      subs.push(sub);
      createdSubs++;
      console.log(`✅ Created sub_account "${sub.name}" (${sub.id})`);
    }

    const ctMatch = ctNumbers.find((n) => n.e164 === item.e164);
    if (!ctMatch) {
      console.log(`⚠️  ${item.e164} (${item.cliente}) not found in CloudTalk — SKIP`);
      missingInCloudtalk++;
      continue;
    }

    const exists = await prisma.phoneNumber.findUnique({ where: { e164: item.e164 } });
    if (exists) {
      console.log(`⏭  ${item.e164} already in DB (linked to ${exists.subAccountId})`);
      skippedNumbers++;
      continue;
    }

    const created = await prisma.phoneNumber.create({
      data: {
        subAccountId: sub.id,
        cloudtalkNumberId: ctMatch.id,
        e164: item.e164,
        country: ctMatch.countryCode ?? 'US',
        label: ctMatch.internalName ?? item.cliente,
        status: 'active',
        purchasedAt: new Date(),
      },
    });
    createdNumbers++;
    console.log(`📞 Linked ${created.e164} → ${sub.name} (cloudtalkNumberId=${ctMatch.id})`);
  }

  console.log('\n============== SUMMARY ==============');
  console.log(`Sub accounts created:     ${createdSubs}`);
  console.log(`Phone numbers created:    ${createdNumbers}`);
  console.log(`Phone numbers skipped:    ${skippedNumbers}`);
  console.log(`Missing in CloudTalk:     ${missingInCloudtalk}`);
  console.log('=====================================');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  await prisma.$disconnect();
  process.exit(1);
});
