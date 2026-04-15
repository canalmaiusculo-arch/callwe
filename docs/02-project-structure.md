# Estrutura do Projeto — Monorepo

Monorepo com **pnpm workspaces** + **Turborepo**. Três aplicações principais + pacotes compartilhados.

```
callwe/
├── apps/
│   ├── api/                    # NestJS — API REST/WebSocket + webhook receivers
│   ├── web/                    # Next.js 15 (App Router) — painéis de todos os perfis
│   └── worker/                 # BullMQ workers (fila de webhooks, transcrição, sync)
│
├── packages/
│   ├── db/                     # Prisma schema + migrations + seed
│   ├── shared/                 # tipos, enums, DTOs compartilhados (zod)
│   ├── cloudtalk-sdk/          # wrapper tipado da API CloudTalk
│   ├── meta-ads-sdk/           # wrapper Facebook Graph API (Lead Ads)
│   └── ui/                     # componentes React compartilhados (shadcn)
│
├── infra/
│   ├── docker/                 # Dockerfiles por app
│   ├── docker-compose.yml      # dev local
│   ├── docker-compose.prod.yml # produção VPS
│   ├── nginx/                  # reverse proxy + SSL
│   └── scripts/                # deploy.sh, backup.sh, restore.sh
│
├── docs/                       # documentação do projeto
├── .github/workflows/          # CI/CD
├── .env.example
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## apps/api/ (NestJS)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── config/                     # ConfigModule + validação env (zod)
│
├── common/
│   ├── guards/                 # JwtAuthGuard, RolesGuard, TenantGuard
│   ├── decorators/             # @CurrentUser, @CurrentTenant, @Roles
│   ├── interceptors/           # logging, audit
│   ├── filters/                # exception filter
│   ├── pipes/                  # ZodValidationPipe
│   └── middleware/             # tenant-context (SET LOCAL no Postgres)
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts  # login, refresh, mfa, invite accept
│   │   ├── auth.service.ts
│   │   ├── strategies/         # jwt, local
│   │   └── dto/
│   │
│   ├── agencies/
│   ├── sub-accounts/
│   ├── users/
│   ├── memberships/
│   │
│   ├── leads/
│   │   ├── leads.controller.ts
│   │   ├── leads.service.ts
│   │   ├── leads.gateway.ts    # WebSocket — lead criado em tempo real
│   │   └── dto/
│   │
│   ├── interactions/
│   │   ├── interactions.controller.ts
│   │   ├── interactions.service.ts
│   │   └── recording-access.service.ts  # registra acesso LGPD
│   │
│   ├── briefings/
│   ├── phone-numbers/
│   ├── routing/
│   ├── integrations/
│   │
│   ├── cloudtalk/
│   │   ├── cloudtalk.module.ts
│   │   ├── cloudtalk.service.ts        # chamadas à API
│   │   ├── webhooks.controller.ts      # recebe webhooks
│   │   ├── signature.guard.ts          # valida assinatura
│   │   ├── call-flow.controller.ts     # endpoint pro HTTP Request Step (briefing pré-chamada)
│   │   └── cuecards.service.ts         # injeta card no softphone
│   │
│   ├── meta-ads/
│   │   ├── meta-ads.controller.ts      # OAuth, subscribe
│   │   ├── webhooks.controller.ts      # recebe leadgen
│   │   └── meta-ads.service.ts
│   │
│   ├── realtime/
│   │   ├── realtime.gateway.ts         # socket.io — painel do atendente
│   │   └── presence.service.ts         # Redis pub/sub
│   │
│   ├── billing/
│   └── audit/
│
└── queues/                     # definições de fila (produtores)
    ├── webhooks.queue.ts
    ├── recordings.queue.ts
    └── transcription.queue.ts
```

### Convenções
- Um módulo por domínio; `controller → service → repository (prisma)`.
- DTOs com **zod** + `ZodValidationPipe`.
- Erros via exceções do Nest; filtro global converte pra payload padrão.
- Todo endpoint autenticado passa por `TenantGuard` que:
  1. Lê `X-Sub-Account-Id` header (ou subdomínio).
  2. Verifica membership do usuário.
  3. Injeta `sub_account_id` no contexto da request.
  4. Abre transação Prisma com `SET LOCAL app.current_sub_account_id`.

---

## apps/web/ (Next.js 15 App Router)

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── accept-invite/
│   │   └── mfa/
│   │
│   ├── (agency)/[agencySlug]/               # painel agência
│   │   ├── dashboard/
│   │   ├── sub-accounts/
│   │   ├── users/
│   │   ├── billing/
│   │   └── settings/
│   │
│   ├── (workspace)/[agencySlug]/[subSlug]/  # painel subconta
│   │   ├── dashboard/
│   │   ├── leads/
│   │   │   ├── page.tsx                     # lista (kanban/tabela)
│   │   │   └── [leadId]/page.tsx            # detalhe + timeline
│   │   ├── calls/                           # registros
│   │   │   └── [callId]/page.tsx            # player, transcript, notas
│   │   ├── sms/
│   │   ├── voicemails/
│   │   ├── briefing/
│   │   ├── phone-numbers/
│   │   ├── routing/
│   │   ├── integrations/
│   │   │   ├── meta-ads/
│   │   │   └── cloudtalk/
│   │   └── settings/
│   │
│   ├── (agent)/agent/                       # painel do atendente
│   │   ├── page.tsx                         # queue + softphone embed + briefing panel
│   │   └── components/
│   │       ├── SoftphoneFrame.tsx           # iframe CloudTalk
│   │       ├── IncomingCallPopup.tsx        # briefing em tempo real
│   │       ├── LeadSidebar.tsx
│   │       └── CallNotes.tsx
│   │
│   ├── (client)/client/[subSlug]/           # cliente final só-leitura
│   │   ├── calls/
│   │   ├── sms/
│   │   ├── voicemails/
│   │   └── reports/
│   │
│   ├── api/                                 # apenas BFF leve, auth, proxy seguro
│   │   └── auth/[...nextauth]/route.ts
│   │
│   └── layout.tsx
│
├── components/
│   ├── ui/                                  # shadcn
│   ├── tables/
│   ├── charts/
│   └── layout/
│
├── lib/
│   ├── api-client.ts                        # fetch wrapper tipado
│   ├── socket.ts                            # socket.io-client
│   ├── auth.ts                              # next-auth config
│   └── permissions.ts                       # helpers de RBAC
│
├── hooks/
│   ├── useRealtimeCalls.ts
│   ├── useLead.ts
│   └── usePresence.ts
│
├── stores/                                  # zustand
│   ├── agent-store.ts
│   └── ui-store.ts
│
└── types/
```

Stack frontend:
- **Next.js 15** (App Router, Server Components)
- **next-auth v5** (Auth.js) para sessão
- **TanStack Query** para estado de servidor
- **Zustand** para estado do softphone/UI
- **shadcn/ui + Tailwind**
- **socket.io-client** para tempo real
- **react-hook-form + zod**

---

## apps/worker/ (BullMQ)

```
apps/worker/src/
├── main.ts                           # inicializa workers
├── processors/
│   ├── cloudtalk-webhook.processor.ts    # consome webhook_inbox
│   ├── recording-sync.processor.ts       # baixa gravação → R2
│   ├── transcription.processor.ts        # (fallback Whisper se não usar AI CloudTalk)
│   ├── meta-leadgen.processor.ts         # busca lead completo via Graph API
│   ├── sla-checker.processor.ts          # cron — alerta se lead não atendido
│   └── usage-aggregator.processor.ts     # diário — consolida usage_counters
├── jobs/                             # schedulers
└── lib/                              # reuso dos packages/
```

---

## packages/db/ (Prisma)

```
packages/db/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── client.ts                     # singleton PrismaClient
│   └── rls.ts                        # helper pra setar tenant context
└── package.json
```

---

## packages/cloudtalk-sdk/

```
packages/cloudtalk-sdk/src/
├── client.ts                         # axios com auth + retry/backoff
├── resources/
│   ├── agents.ts
│   ├── calls.ts
│   ├── contacts.ts
│   ├── numbers.ts
│   ├── sms.ts
│   ├── tags.ts
│   ├── cuecards.ts
│   └── groups.ts
├── webhooks/
│   ├── types.ts                      # tipos de payload
│   └── verify.ts                     # assinatura
└── rate-limiter.ts                   # bucket por API key
```

---

## infra/

### docker-compose.yml (dev)
Serviços: `postgres`, `redis`, `minio` (stand-in S3), `mailhog`, `api`, `web`, `worker`.

### docker-compose.prod.yml (VPS)
- `nginx` (reverse proxy + certbot)
- `api`, `web`, `worker` (containers próprios, restart=always)
- `postgres`, `redis` (volumes persistentes)
- Sem minio — usar R2/S3 real.
- Healthchecks em todos.

### Scripts
- `deploy.sh` — pull, build, migrate, rolling restart
- `backup.sh` — pg_dump + sync R2, diário via cron
- `restore.sh` — restore de backup

---

## CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` — lint, typecheck, test em cada PR.
- `.github/workflows/deploy.yml` — em merge pra `main`: build imagens → push GHCR → SSH VPS → `deploy.sh`.

---

## Qualidade

- **ESLint + Prettier** configurados na raiz.
- **TypeScript strict** em todos apps/packages.
- **Vitest** para unit; **Playwright** para e2e no web; **supertest** para api.
- **Husky + lint-staged** em pre-commit.
- **Commitlint** conventional commits.
