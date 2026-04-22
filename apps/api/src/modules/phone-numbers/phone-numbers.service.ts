import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudtalkService } from '../cloudtalk/cloudtalk.service.js';

@Injectable()
export class PhoneNumbersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudtalk: CloudtalkService,
  ) {}

  list(subAccountId: string) {
    return this.prisma.phoneNumber.findMany({
      where: { subAccountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lista TODOS os números do CloudTalk (já cadastrados ou não em alguma subconta). */
  async listAvailable() {
    const ctNumbers = await this.cloudtalk.client.http.get('/numbers/index.json', {
      params: { limit: 200 },
    });
    type CtItem = {
      CallNumber: {
        id: string;
        internal_name?: string;
        caller_id_e164: string;
        country_code?: string;
      };
    };
    const data = (ctNumbers.data?.responseData?.data ?? []) as CtItem[];

    const e164List = data.map((n) => normalizeE164(n.CallNumber.caller_id_e164));

    const taken = await this.prisma.phoneNumber.findMany({
      where: { e164: { in: e164List }, status: 'active' },
      select: { e164: true, subAccount: { select: { id: true, name: true } } },
    });
    const takenMap = new Map(taken.map((t) => [t.e164, t.subAccount.name]));

    return data.map((n) => {
      const e164 = normalizeE164(n.CallNumber.caller_id_e164);
      return {
        cloudtalkNumberId: n.CallNumber.id,
        e164,
        label: n.CallNumber.internal_name || null,
        country: n.CallNumber.country_code ?? null,
        assignedTo: takenMap.get(e164) ?? null,
      };
    });
  }

  async create(subAccountId: string, input: { cloudtalkNumberId: string; e164: string; label?: string; country?: string }) {
    const exists = await this.prisma.phoneNumber.findUnique({ where: { e164: input.e164 } });
    if (exists) throw new ConflictException(`Número ${input.e164} já cadastrado`);
    return this.prisma.phoneNumber.create({
      data: {
        subAccountId,
        cloudtalkNumberId: input.cloudtalkNumberId,
        e164: input.e164,
        label: input.label,
        country: input.country ?? 'US',
        status: 'active',
        purchasedAt: new Date(),
      },
    });
  }

  async release(id: string) {
    const pn = await this.prisma.phoneNumber.findUnique({ where: { id } });
    if (!pn) throw new NotFoundException();
    return this.prisma.phoneNumber.update({ where: { id }, data: { status: 'released' } });
  }
}

function normalizeE164(num: string): string {
  if (!num) return '';
  const digits = num.trim().replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}
