# Go-Live Checklist — primeiro deploy do CallWe

Sequência prática para sair do código local até produção rodando. Estimativa: **2-3 dias** se nada bloquear (Meta App Review é o que pode atrasar).

---

## Fase 0 — Antes de tocar em servidor

- [ ] **Criar repositório GitHub** (privado), `git init` no projeto, primeiro push.
- [ ] **Comprar domínio** (`callwe.app` ou similar) e configurar DNS no Cloudflare:
  - `app.callwe.app` → IP da VPS (proxy DNS-only inicialmente; ativa proxy depois do SSL).
  - `api.callwe.app` → IP da VPS.
- [ ] **Criar conta Cloudflare R2** + bucket `callwe-prod` + API token (R/W escopado ao bucket).
- [ ] **Criar conta CloudTalk** (plano Expert para ter Webhooks + AI):
  - Anotar `API Key ID` e `Secret`.
  - Pedir ao suporte o `Phone SDK Partner ID` (pode levar 1 dia).
  - Criar Call Flow com **HTTP Request Step** apontando para `https://api.callwe.app/api/cloudtalk/call-flow/incoming` + `Parse Response: true`.
  - Configurar Workflow Automations para enviar webhook para `https://api.callwe.app/api/webhooks/cloudtalk` com secret HMAC.
- [ ] **Criar Meta App** em `developers.facebook.com`:
  - Tipo: **Business**.
  - Adicionar produtos: Facebook Login for Business, Webhooks, Marketing API.
  - Definir tela de permissões: `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`.
  - **Submeter App Review** — ⚠️ leva 5-10 dias úteis. **Submeta no dia 1.**
- [ ] **Criar conta Postmark/Resend** + domínio verificado + DKIM/SPF.

## Fase 1 — VPS

- [ ] **Provisionar VPS Hetzner CX22** (4 vCPU, 8GB, ~€4/mês).
- [ ] **SSH como root** + rodar `bootstrap-vps.sh` (instala Docker, UFW, fail2ban, cria user `callwe`).
- [ ] **Adicionar chave SSH** do GitHub Actions deploy ao usuário `callwe` (`~/.ssh/authorized_keys`).
- [ ] **Clonar repo** em `/opt/callwe`.
- [ ] **Configurar `/opt/callwe/infra/.env`** — gerar TODOS os secrets:
  ```bash
  openssl rand -base64 64   # JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, NEXTAUTH_SECRET
  openssl rand -hex 32      # ENCRYPTION_KEY, POSTGRES_PASSWORD, REDIS_PASSWORD
  ```
- [ ] **Emitir SSL** com certbot:
  ```bash
  cd /opt/callwe/infra
  docker run --rm -p 80:80 -v $(pwd)/nginx/ssl:/etc/letsencrypt \
    certbot/certbot certonly --standalone --agree-tos -m ops@callwe.app \
    --non-interactive -d app.callwe.app -d api.callwe.app
  ```
- [ ] **Cron de renovação** SSL (`crontab -e` do usuário `callwe`):
  ```
  0 3 * * * cd /opt/callwe/infra && docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt certbot/certbot renew --quiet && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
  ```

## Fase 2 — CI/CD

- [ ] **GitHub Secrets** no repositório:
  - `VPS_HOST`, `VPS_USER=callwe`, `VPS_SSH_KEY` (chave privada).
  - `NEXT_PUBLIC_API_URL=https://api.callwe.app`
  - `NEXT_PUBLIC_CLOUDTALK_PARTNER_ID=<obtido do CloudTalk>`
- [ ] **Primeiro push em `main`** → workflow `deploy.yml` builda 4 imagens em paralelo, publica no GHCR, faz SSH e roda `deploy.sh`.
- [ ] Verificar:
  ```bash
  curl https://api.callwe.app/health    # { status: "ok", db: true }
  curl https://app.callwe.app           # 200, HTML do Next.js
  ```

## Fase 3 — Bootstrap dos dados

- [ ] **Rodar seed em produção** (cria agency demo + admin):
  ```bash
  ssh callwe@$VPS docker compose -f /opt/callwe/infra/docker-compose.prod.yml run --rm migrate \
    sh -c 'cd /app && pnpm --filter @callwe/db seed'
  ```
- [ ] **Login** com `admin@callwe.test` / `admin1234`.
- [ ] **Trocar senha imediatamente** (use o endpoint `/auth/register` para criar um user real e remova o seed depois).
- [ ] **Criar Role Postgres `callwe_app`** (sem BYPASSRLS) e atualizar `DATABASE_URL` para usá-lo (ver [04-rls-and-tenancy.md](04-rls-and-tenancy.md)).

## Fase 4 — Validar integrações

### CloudTalk
- [ ] Comprar 1 número de teste no painel CloudTalk.
- [ ] Atribuir tag `sub:<UUID-da-subconta-demo>` ao número (ou ao Ring Group).
- [ ] Ligar para o número de fora.
- [ ] Verificar:
  - Webhook chega em `webhook_inbox` (postgres).
  - `Interaction` é criada.
  - Realtime emite `call:incoming` ao painel `/agent`.
  - Após desligar, gravação é sincronizada para R2.

### Meta Ads
- [ ] **Aguardar App Review aprovada.**
- [ ] No `/workspace/integrations`, clicar "Conectar Meta Ads".
- [ ] Autorizar no Facebook → callback → redireciona para `/workspace/integrations/meta-ads/forms`.
- [ ] Selecionar página → ativar formulário.
- [ ] Submeter um lead de teste (Facebook tem ferramenta de teste para Lead Ads).
- [ ] Verificar `Lead` criado com `source: meta_ads`.

## Fase 5 — Observabilidade e backup

- [ ] **Sentry** — criar 3 projetos (api, web, worker), adicionar DSNs no `.env`.
- [ ] **UptimeRobot** — monitor 5min em `https://api.callwe.app/health` e `https://app.callwe.app`.
- [ ] **Cron de backup** (já documentado em [05-deploy-guide.md](05-deploy-guide.md)):
  ```
  0 2 * * * cd /opt/callwe && source infra/.env && bash infra/scripts/backup.sh >> /var/log/callwe-backup.log 2>&1
  ```
- [ ] **Testar restore** em ambiente isolado uma vez antes de confiar nele.
- [ ] **Cloudflare proxy ON** (laranja) — DDoS + cache de assets.

## Fase 6 — Endurecimento

- [ ] **Trocar role do app** para `callwe_app` (sem BYPASSRLS).
- [ ] **Rodar teste e2e de isolamento multi-tenant** (criar dois subaccounts, garantir que A não vê B).
- [ ] **Auditar logs** primeiros dias — qualquer 5xx vai para Sentry.
- [ ] **Rate limit** já está em 120 req/min — ajustar conforme padrão de uso.
- [ ] **Definir política de retenção LGPD** — quanto tempo guardar gravações? Adicionar job de purga.

---

## Quando algo der errado

| Sintoma | Onde olhar |
|---|---|
| Webhook CloudTalk não cai | Cloudflare WAF? `nginx/proxy_request_buffering off`? Secret correto? |
| Webhook Meta sem assinatura válida | `rawBody: true` no NestJS? `META_APP_SECRET` correto? |
| OAuth Meta retorna erro | App Review aprovada? Domínio do `redirect_uri` adicionado em "Valid OAuth URIs"? |
| Realtime não conecta | Cloudflare WebSocket habilitado (default sim)? Headers `Upgrade` no nginx? |
| Migration falha | `docker compose run --rm migrate` direto pra ver erro completo. |
| Healthcheck do api falha | Conectividade Postgres + Redis? Env vars todas presentes? |

---

## Pós go-live: roadmap recomendado

Em ordem de prioridade nas primeiras semanas após primeiro cliente:

1. **Notas pós-chamada e tags por interaction** — atendentes pedem isso na primeira semana.
2. **Convite de usuário por email** (`/auth/invite`) — hoje só dá para criar via seed.
3. **Múltiplos usuários por subaccount** — UI de gestão de membros.
4. **Filtros avançados na lista de leads** (data, atendente, tags).
5. **Dashboard cliente-final** (`/client/[subSlug]`) — login só-leitura para o cliente da agência.
6. **Notas no LeadDetail** com input (já lê, falta editar).
7. **Click-to-call** no LeadDetail (botão chama `cloudtalk.calls.clickToCall`).
8. **Disparo SMS** do LeadDetail.
9. **Transcrição/sentimento real** — habilitar CloudTalk AI (€9/user/mês) ou Whisper.
10. **WhatsApp Business** — fase 2.
11. **Billing** — quando cobrar das agências.
