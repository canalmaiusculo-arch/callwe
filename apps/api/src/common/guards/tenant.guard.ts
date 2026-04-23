import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Lê `X-Sub-Account-Id` do header e verifica acesso:
 * - super_admin: acesso a qualquer subconta
 * - agency_admin: acesso a subcontas da própria agência
 * - agent/sub_account_admin/client_viewer: acesso direto via membership
 * Injeta `req.tenant = { subAccountId, agencyId, role }`.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Unauthenticated');

    const subAccountId = req.headers['x-sub-account-id'] as string | undefined;
    if (!subAccountId) throw new ForbiddenException('Missing X-Sub-Account-Id');

    type M = { role: string; agencyId?: string; subAccountId?: string };
    const memberships = (user.memberships ?? []) as M[];

    // Super admin pode tudo
    const superAdmin = memberships.find((m) => m.role === 'super_admin');
    if (superAdmin) {
      req.tenant = { subAccountId, agencyId: null, role: 'super_admin' };
      return true;
    }

    // Agency admin: qualquer subconta da sua agência conta como membership implícita
    const agencyAdmin = memberships.find((m) => m.role === 'agency_admin');
    if (agencyAdmin) {
      req.tenant = { subAccountId, agencyId: agencyAdmin.agencyId, role: 'agency_admin' };
      return true;
    }

    // Demais roles: membership direta
    const membership = memberships.find((m) => m.subAccountId === subAccountId);
    if (!membership) throw new ForbiddenException('No access to this sub-account');

    req.tenant = {
      subAccountId,
      agencyId: membership.agencyId,
      role: membership.role,
    };
    return true;
  }
}
