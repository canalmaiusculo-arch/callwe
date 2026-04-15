# Multi-tenancy e Row Level Security

Duas camadas de isolamento — se uma falhar, a outra protege.

## Camada 1: aplicação (NestJS)

`TenantGuard` ([tenant.guard.ts](../apps/api/src/common/guards/tenant.guard.ts)) em toda rota de subconta:

1. Lê `X-Sub-Account-Id` do header.
2. Confere que o usuário autenticado tem `membership` naquela subconta.
3. Injeta `req.tenant = { subAccountId, agencyId, role }`.
4. Serviços só aceitam o `subAccountId` vindo do guard, nunca do body.

## Camada 2: banco de dados (Postgres RLS)

Antes de qualquer query dentro de uma request de subconta, o backend abre uma transação e executa:

```sql
SET LOCAL app.current_sub_account_id = '<uuid>';
```

Helper: `withTenant()` em [packages/db/src/rls.ts](../packages/db/src/rls.ts).

As policies (ver [migration RLS](../packages/db/prisma/migrations/20260414000001_rls_policies/migration.sql)) filtram automaticamente toda query em:

- Tabelas diretas: `leads`, `interactions`, `briefings`, `briefing_revisions`, `integrations`, `meta_lead_forms`, `phone_numbers`, `cloudtalk_agents`, `routing_rules`, `sla_policies`, `usage_counters`.
- Tabelas indiretas (join): `lead_notes`, `interaction_events`, `recording_access_logs`.
- `audit_logs` permite `sub_account_id IS NULL` (eventos globais) OU match.

Se `app.current_sub_account_id` não estiver setado, **nenhuma linha** é retornada — failsafe.

## Roles do Postgres

Dois roles:

| Role | Uso | BYPASSRLS |
|---|---|---|
| `callwe_app` | API + worker | **Não** |
| `callwe_admin` | migrations, jobs administrativos, super-admin | Sim |

Criar em produção:

```sql
CREATE ROLE callwe_app LOGIN PASSWORD '...' NOBYPASSRLS;
CREATE ROLE callwe_admin LOGIN PASSWORD '...' BYPASSRLS;
GRANT CONNECT ON DATABASE callwe TO callwe_app, callwe_admin;
GRANT USAGE ON SCHEMA public TO callwe_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO callwe_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO callwe_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO callwe_app;
```

Em dev o usuário default (`callwe`) é superuser e ignora RLS. Isso é ok para iterar. **Em produção** usar sempre `callwe_app` no `DATABASE_URL`.

## Tabelas fora do RLS

- `agencies`, `sub_accounts`, `users`, `memberships`, `sessions` — não têm tenant único; protegidas por rotas admin (RolesGuard com `agency_admin` / `super_admin`).
- `webhook_inbox` — só o worker lê; rota de escrita recebe dado externo antes de resolver o tenant.

## Teste automatizado obrigatório

Antes de qualquer deploy, rodar um teste e2e que:

1. Cria 2 subcontas (A e B).
2. Cria um usuário vinculado só à A.
3. Tenta listar leads da B com o token da A + header `X-Sub-Account-Id: <B>` → espera 403.
4. Tenta listar leads da B passando body do tipo `{ subAccountId: B }` → service deve ignorar body e usar `req.tenant` → só vê A.
5. Via `psql` com role `callwe_app` e `SET LOCAL app.current_sub_account_id = '<A>'`, `SELECT` em `leads` só retorna leads da A.
