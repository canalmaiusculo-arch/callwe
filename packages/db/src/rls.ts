import { Prisma } from '@prisma/client';
import { prisma } from './client.js';

/**
 * Executa um bloco dentro de uma transação com o tenant context setado.
 * Policies de RLS em tabelas de negócio leem `app.current_sub_account_id`.
 */
export async function withTenant<T>(
  subAccountId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_sub_account_id = '${subAccountId.replace(/'/g, '')}'`,
    );
    return fn(tx);
  });
}
