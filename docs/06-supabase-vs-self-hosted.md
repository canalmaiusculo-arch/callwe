# Supabase vs. Self-hosted — análise para o CallWe

## TL;DR

**Não recomendo Supabase para este projeto**, exceto possivelmente como **provedor de Postgres gerenciado** (e mesmo isso, só se você não quiser gerenciar Postgres no VPS).

A arquitetura que construímos (NestJS + Prisma + RLS próprio + JWT/argon2 + multi-tenancy + filas BullMQ + workers) **não se beneficia** das partes que tornam Supabase atraente, e algumas decisões já tomadas conflitam com as defaults do Supabase.

---

## O que Supabase oferece

| Componente | O que é | Já temos? |
|---|---|---|
| Postgres gerenciado | Banco hospedado | Postgres em Docker (ou pode terceirizar) |
| **Auth** | Login email/senha, OAuth, JWT, magic link | ✅ JWT + argon2id próprio + memberships multi-tenant |
| **Storage** | Object storage com policies | ✅ R2/S3 |
| **Realtime** | LISTEN/NOTIFY → WebSocket broadcast | ✅ socket.io |
| **Edge Functions** | Deno serverless | ❌ não usamos — temos NestJS + workers |
| **PostgREST** | API REST automática do schema | ❌ não usamos — controllers explícitos |

## Por que **não** trocar para Supabase

### 1. Auth — é o ponto mais crítico

Nosso modelo:
```
User ──┬─ Membership ── Agency (admin global da agência)
       └─ Membership ── SubAccount (admin/agent/viewer da subconta)
```

Supabase Auth assume **um user = uma role plana**, com `auth.users` separado do seu schema. Para fazer multi-tenant você precisaria:
- Manter `users` shadow no seu schema (ponte por `auth.users.id`).
- Reescrever todo o RBAC nos JWT claims customizados.
- Lidar com o fato de que Supabase Auth não sabe sobre suas memberships.

Na prática, você acaba **mantendo as duas coisas**: Supabase Auth + sua tabela de memberships. Pior dos dois mundos.

### 2. RLS — já temos, mas Supabase exige um padrão diferente

Supabase RLS depende de `auth.uid()` injetado pelo PostgREST. Nosso padrão:
```sql
SET LOCAL app.current_sub_account_id = '...'
```
…que é controlado pelo TenantGuard do NestJS. Se trocarmos para Supabase, ou:
- Ignoramos o RLS deles (paga sem usar), ou
- Refazemos todas as policies para o estilo `auth.uid() IN (SELECT ...)`.

### 3. Webhooks com raw body (assinatura HMAC)

CloudTalk e Meta enviam webhooks que precisam ser **validados pelo body bruto**. Edge Functions do Supabase têm acesso, mas o roteamento, retry e fila dependeriam de outra coisa. NestJS faz isso nativamente com `rawBody: true`.

### 4. Filas + workers de longa duração

BullMQ + Redis = workers que rodam por horas, com retry exponencial, scheduling cron, prioridade. Supabase Edge Functions têm timeout de poucos minutos. Você acabaria precisando de outra infra para os workers de qualquer jeito.

### 5. Custo na escala

| Cenário | Supabase Pro | VPS Hetzner CX32 + R2 |
|---|---|---|
| Até ~50 subcontas | ~$25/mês + storage + bandwidth | ~€8/mês + ~$5 R2 |
| 200 subcontas, 50GB DB, 200GB storage | ~$300+/mês | ~€20/mês + ~$10 R2 |

Supabase escala bem em **DX**, não em **custo bruto**.

### 6. Vendor lock parcial

Supabase é open-source (você pode self-host depois), mas Auth/Storage/Realtime têm APIs próprias. Migrar de volta exige reescrever esses pedaços.

---

## Quando Supabase **faria** sentido

- Projeto novo, time pequeno, sem backend ainda.
- Você quer parar de pensar em infra por 6 meses.
- Multi-tenant simples (1 user = 1 conta).
- Não precisa de workers de longa duração.

Nenhum desses aplica aqui.

---

## Opção intermediária: **Postgres gerenciado** (sem Auth/Storage/Realtime)

Se a única dor for "não quero rodar Postgres na VPS":

| Provedor | Plano inicial | Notas |
|---|---|---|
| **Supabase Pro** (só DB) | $25/mês, 8GB DB, daily backup | Bom UI, mas você paga por features que não usa |
| **Neon** | Free tier 3GB → $19/mês | Branching de DB excelente, serverless |
| **Hetzner Cloud Postgres** | €5/mês | Mais barato, na mesma rede da VPS, latência mínima |
| **Render Postgres** | $7/mês | Simples, 1GB inicial |
| **Self-host na VPS** | €0 extra | O que está configurado hoje |

**Recomendação:** começar **self-host na própria VPS** (Rota A), com `pg_dump` diário pro R2. Quando passar de ~10GB ou 50 subcontas, **migrar para Hetzner Cloud Postgres** (mesma rede, latência <1ms, troca de `DATABASE_URL`).

---

## Resumo da decisão

| Componente | Manter | Trocar para Supabase? | Verdict |
|---|---|---|---|
| Postgres | Docker na VPS | Possível (managed) | Manter por enquanto |
| Auth | JWT + argon2 + memberships | ❌ conflita com nosso modelo | Manter |
| Storage (gravações) | Cloudflare R2 | Pode (Supabase Storage) | Manter R2 (mais barato) |
| Realtime | socket.io | Pode | Manter (já está pronto) |
| Workers | BullMQ + Redis | ❌ Edge Functions não atendem | Manter |

**Decisão final:** seguir com a stack atual. Reavaliar Postgres gerenciado quando atingir 10GB ou 50 subcontas.
