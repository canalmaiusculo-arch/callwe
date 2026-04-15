import { Injectable } from '@nestjs/common';
import { Prisma } from '@callwe/db';
import type { IntegrationProvider } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { encryptJson, decryptJson } from './crypto.js';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(subAccountId: string) {
    return this.prisma.integration.findMany({
      where: { subAccountId },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertCredentials(
    subAccountId: string,
    provider: IntegrationProvider,
    credentials: Record<string, unknown>,
    settings: Record<string, unknown> = {},
  ) {
    const encrypted = encryptJson(credentials);
    return this.prisma.integration.upsert({
      where: { subAccountId_provider: { subAccountId, provider } },
      update: {
        credentials: encrypted as unknown as Prisma.InputJsonValue,
        settings: settings as Prisma.InputJsonValue,
        status: 'connected',
        lastError: null,
      },
      create: {
        subAccountId,
        provider,
        credentials: encrypted as unknown as Prisma.InputJsonValue,
        settings: settings as Prisma.InputJsonValue,
        status: 'connected',
      },
    });
  }

  async getDecrypted<T = Record<string, unknown>>(
    subAccountId: string,
    provider: IntegrationProvider,
  ): Promise<T | null> {
    const row = await this.prisma.integration.findUnique({
      where: { subAccountId_provider: { subAccountId, provider } },
    });
    if (!row) return null;
    return decryptJson<T>(row.credentials as Record<string, unknown>);
  }
}
