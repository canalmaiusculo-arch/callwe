# CallWe

Framework de call center multi-tenant em cima da CloudTalk. Agências gerenciam subcontas (clientes finais), com CRM, gravações, briefings, integração Meta Ads e painéis para atendentes, gestores e clientes.

## Funcionalidades

- 🏢 **Multi-tenant**: Agency → SubAccount com RBAC (super_admin, agency_admin, sub_account_admin, agent, client_viewer).
- 📞 **CloudTalk**: telefonia, gravação, voicemail, SMS, click-to-call, CueCards de briefing pré-chamada.
- 📋 **CRM**: leads com status, custom fields, tags, notas, timeline unificada de interações (call/sms/voicemail/form).
- 📝 **Briefing por subconta**: editor + revisões, aparece automaticamente para o atendente quando a chamada toca.
- 📱 **Meta Ads (Lead Ads)**: OAuth, seleção de páginas/formulários, webhook → CRM em tempo real.
- ⚡ **Realtime**: socket.io para chamada entrante e novos leads chegando ao painel do atendente.
- 🤖 **IA pós-chamada**: integra com CloudTalk AI (transcrição + sentimento + resumo) ou Whisper.
- 🔐 **Segurança**: argon2id, JWT + refresh tokens, criptografia AES-256-GCM de credenciais de terceiros, RLS no Postgres, validação HMAC de webhooks.
- 📊 **Auditoria + LGPD**: log de quem ouviu cada gravação, audit log genérico.

## Stack

- **Backend**: NestJS 10 + Prisma 5 + PostgreSQL 16 + Redis 7 + BullMQ
- **Frontend**: Next.js 15 (App Router) + TanStack Query + Zustand + Tailwind + shadcn/ui + socket.io-client
- **Worker**: BullMQ standalone (Node)
- **Infra**: Docker Compose + Nginx + Let's Encrypt em VPS
- **Storage**: Cloudflare R2 (gravações)
- **CI/CD**: GitHub Actions → GHCR → SSH deploy

## Estrutura do monorepo

```
apps/
  api/      NestJS — REST + WebSocket + receivers de webhook
  web/      Next.js — painéis (auth, agency, workspace, agent, client)
  worker/   BullMQ — webhook processing, recording sync, transcription, SLA, billing
packages/
  db/                Prisma schema + migrations + RLS
  shared/            Zod env, RBAC helpers
  cloudtalk-sdk/     Wrapper tipado da API CloudTalk + verify de webhooks
  meta-ads-sdk/      Wrapper Graph API + OAuth + verify de webhooks
infra/
  docker/            Dockerfiles multi-stage
  docker-compose.yml      dev local
  docker-compose.prod.yml produção VPS
  nginx/             Reverse proxy + SSL
  scripts/           bootstrap-vps.sh, deploy.sh, backup.sh, restore.sh
docs/                Documentação técnica
```

## Setup local (Windows / macOS / Linux)

Requisitos: Node 20+, pnpm 9+, Docker.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local

pnpm install
pnpm docker:dev            # postgres, redis, minio, mailhog
pnpm db:generate
pnpm db:migrate
pnpm db:seed               # cria admin@callwe.test / admin1234

pnpm dev                   # api + web + worker em paralelo
```

URLs em dev:
- Web: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/health
- MinIO Console: http://localhost:9001
- Mailhog: http://localhost:8025

## Comandos principais

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe api + web + worker |
| `pnpm build` | Builda tudo |
| `pnpm typecheck` | TypeScript em todos os pacotes |
| `pnpm db:migrate` | Aplica migrations Prisma |
| `pnpm db:studio` | Abre Prisma Studio |
| `pnpm docker:dev` / `pnpm docker:dev:down` | Sobe/derruba infra dev |

## Documentação

| Doc | Conteúdo |
|---|---|
| [docs/01-database-schema.md](docs/01-database-schema.md) | Schema Postgres com 22 tabelas |
| [docs/02-project-structure.md](docs/02-project-structure.md) | Estrutura detalhada do monorepo |
| [docs/03-credentials-checklist.md](docs/03-credentials-checklist.md) | Tudo que precisa ser obtido externamente |
| [docs/04-rls-and-tenancy.md](docs/04-rls-and-tenancy.md) | Camadas de isolamento multi-tenant |
| [docs/05-deploy-guide.md](docs/05-deploy-guide.md) | Deploy passo-a-passo na VPS |
| [docs/06-supabase-vs-self-hosted.md](docs/06-supabase-vs-self-hosted.md) | Por que NÃO Supabase neste projeto |
| [docs/07-go-live-checklist.md](docs/07-go-live-checklist.md) | Checklist completo para primeiro deploy |
| [CLOUDTALK_RESEARCH.md](CLOUDTALK_RESEARCH.md) | Pesquisa de features CloudTalk: o que reaproveitar vs. construir |

## Caminho do dado — o que acontece quando uma chamada chega

```
[CloudTalk recebe ligação no número da subconta X]
        ↓ HTTP Request Step (Call Flow)
[POST api/cloudtalk/call-flow/incoming]
        ↓ retorna briefing + lead → CueCard no softphone
[CloudTalk dispara webhook call.started]
        ↓
[POST api/webhooks/cloudtalk]
   ├─ valida HMAC
   ├─ salva em webhook_inbox
   ├─ enfileira em BullMQ (cloudtalk-webhook)
   └─ emite call:incoming via socket.io → painel do atendente
        ↓
[Worker cloudtalk-webhook.processor]
   ├─ resolve subconta pela tag
   ├─ upsert Lead (por phone)
   └─ upsert Interaction(type=call, status=ringing)
        ↓ chamada termina, CloudTalk dispara recording.ready
[Worker recording-sync.processor]
   ├─ baixa MP3 da CloudTalk
   ├─ upload pro R2
   └─ enfileira transcription
        ↓
[Atendente abre /workspace/leads/X]
   └─ vê timeline com player + transcrição + sentimento
```

## Deploy resumido

Ver [docs/07-go-live-checklist.md](docs/07-go-live-checklist.md) para checklist completo. Resumo:

1. VPS Hetzner CX22 + DNS (Cloudflare) + R2 bucket.
2. `bootstrap-vps.sh` na VPS.
3. Clonar repo em `/opt/callwe`, configurar `infra/.env`.
4. Emitir SSL via certbot.
5. GitHub Secrets (VPS_HOST, VPS_SSH_KEY, NEXT_PUBLIC_*) + push em `main` → deploy automático.
6. Rodar seed → login admin → trocar senha.
7. Configurar webhooks no CloudTalk e Meta Ads.

## Status

- [x] Schema + RLS multi-tenant
- [x] Auth (JWT + argon2id + refresh tokens)
- [x] CloudTalk SDK + webhook receiver + Call Flow endpoint
- [x] Meta Ads SDK + OAuth + webhook + seleção de formulários
- [x] CRM básico (leads + interactions + notes + briefing)
- [x] Painéis: agency dashboard, workspace (leads/calls/sms/voicemails/briefing/integrations), agent (softphone + briefing pop-up), select-sub-account
- [x] Worker: webhook processing, recording sync, meta leadgen fan-out, SLA, usage aggregator
- [x] Docker Compose dev + prod, Nginx, scripts deploy/backup/restore, GitHub Actions
- [x] Documentação completa
- [ ] Tela de notas pós-chamada (input) — fácil
- [ ] Dashboard cliente-final (`/client/[subSlug]`) — fácil
- [ ] Click-to-call no LeadDetail — fácil
- [ ] WhatsApp Cloud API — fase 2
- [ ] Billing / Stripe — fase 2

## Licença

Privado.
