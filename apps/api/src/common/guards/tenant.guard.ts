import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Lê `X-Sub-Account-Id` do header OU do subdomínio e verifica
 * se o usuário autenticado tem membership naquela subconta.
 * Injeta `req.tenant = { subAccountId, agencyId, role }` para uso posterior.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Unauthenticated');

    const subAccountId = req.headers['x-sub-account-id'] as string | undefined;
    if (!subAccountId) throw new ForbiddenException('Missing X-Sub-Account-Id');

    const membership = user.memberships?.find(
      (m: { subAccountId?: string }) => m.subAccountId === subAccountId,
    );
    if (!membership) throw new ForbiddenException('No access to this sub-account');

    req.tenant = {
      subAccountId,
      agencyId: membership.agencyId,
      role: membership.role,
    };
    return true;
  }
}
