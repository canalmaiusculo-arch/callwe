# Checklist de Credenciais e Contas

O que precisamos obter **antes de começar** a desenvolver cada módulo. Divida em fases para não travar no início.

---

## 🔥 Fase 0 — Setup inicial (obrigatório antes de codar)

| Item | Onde obter | Responsável | Status |
|---|---|---|---|
| Domínio (ex: `callwe.app`) | Registro.br, Cloudflare, Namecheap | — | ☐ |
| Conta Cloudflare (DNS + proxy grátis) | cloudflare.com | — | ☐ |
| Conta GitHub (organização para o monorepo) | github.com | — | ☐ |
| VPS para dev/staging (Hetzner CX22 ~€4/mês) | hetzner.com | — | ☐ |
| Conta de email transacional (Postmark / Resend) | postmarkapp.com ou resend.com | — | ☐ |

---

## 📞 Fase 1 — CloudTalk

| Item | Onde obter | Notas |
|---|---|---|
| Conta CloudTalk (trial 14 dias) | cloudtalk.io/signup | Plano Expert para ter AI, API, Webhooks |
| API Key ID + Secret | `my.cloudtalk.io` → Account → API Keys | 2 valores |
| Phone SDK Partner ID | Suporte CloudTalk (pedir habilitação do embed) | Pode exigir solicitação manual |
| Webhook Secret | Configurado por nós ao criar webhook | String aleatória, validar assinatura |
| Número(s) de teste | Comprar 1 BR via painel CloudTalk | ~€6/mês |
| Habilitar AI Conversation Intelligence | Add-on €9/user/mês | Se for usar transcrição nativa |
| Habilitar **Call Flow Designer** → **HTTP Request Step** | Geralmente já ativo no Expert | Crítico para briefing pré-chamada |

**Testar antes de codar:**
- Fazer uma chamada de teste no softphone web deles.
- Configurar um webhook apontando para `webhook.site` e validar o payload.
- Criar um Call Flow com HTTP Request Step apontando para um endpoint de teste.

---

## 📱 Fase 1 — Meta Ads / Facebook Lead Ads

| Item | Onde obter | Notas |
|---|---|---|
| Conta Meta for Developers | developers.facebook.com | Com 2FA ativo |
| App Meta (tipo **Business**) | Criar em "My Apps" | Nome: "CallWe" |
| Product: **Facebook Login for Business** | Adicionar ao app | Para OAuth |
| Product: **Webhooks** | Adicionar ao app | Subscrever objeto `page` campo `leadgen` |
| Product: **Marketing API** | Adicionar ao app | Para ler Lead Ads |
| Permissões solicitadas | Configurar tela de permissões | `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `ads_management` |
| **App Review** (Meta aprovar permissões) | Submeter app p/ review | **PRAZO: 5-10 dias úteis** — começar cedo |
| Verificação de negócio (Business Verification) | Meta Business Suite | Necessário pra permissões sensíveis |
| App ID + App Secret | Painel do app | Duas strings |
| Webhook Verify Token | Você inventa uma string aleatória | Usada no challenge do webhook |
| System User Token (longa duração) | Meta Business → Users → System Users | Para jobs automáticos pós-OAuth |

**⚠️ Bloqueador potencial:** a App Review da Meta leva dias. Submeter **no início** do projeto, não no fim.

---

## ☁️ Fase 1 — Storage (gravações)

| Item | Onde obter | Notas |
|---|---|---|
| Cloudflare R2 bucket | dash.cloudflare.com → R2 | Sem egress fee, ~$0.015/GB |
| Access Key ID + Secret | R2 → Manage API Tokens | Escopo: apenas o bucket |
| Custom domain (CDN) opcional | Ativar em R2 | `cdn.callwe.app` |

Alternativa: AWS S3 + CloudFront (mais caro por egress).

---

## 🔐 Fase 1 — Secrets que geramos localmente

Gerar com `openssl rand -base64 64` (ou `-hex 32` para 32 bytes):

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY` (32 bytes hex — usado para criptografar tokens de terceiros no banco)
- `META_WEBHOOK_VERIFY_TOKEN`
- `CLOUDTALK_WEBHOOK_SECRET`

**Guardar em:** gerenciador de secrets (1Password, Bitwarden) e **nunca** em git. Em produção usar variáveis de ambiente do docker-compose.

---

## 🧠 Fase 2 — Opcionais / futuros

| Item | Quando | Notas |
|---|---|---|
| OpenAI API Key | Se NÃO usar CloudTalk AI e quisermos Whisper próprio | platform.openai.com |
| Sentry (error tracking) | Antes de produção | sentry.io, plano free serve |
| Stripe | Quando for cobrar das agências | stripe.com |
| WhatsApp Cloud API | Canal extra, fase 2 | developers.facebook.com → WhatsApp |
| Google OAuth (Calendar/Gmail) | Se integrar agendamento | console.cloud.google.com |
| UptimeRobot / BetterStack | Monitoramento | uptime + pages públicas |

---

## 🖥️ Fase 3 — Produção

| Item | Onde obter | Notas |
|---|---|---|
| VPS produção (Hetzner CX32 ~€8 ou CPX31 ~€14) | hetzner.com | Começar pequeno, subir quando necessário |
| Cloudflare Zero Trust (opcional, SSH seguro) | cloudflare.com | Grátis até 50 users |
| Backup storage (R2 bucket separado) | Cloudflare | Para `pg_dump` diário |
| Postmark em produção (sair do sandbox) | postmarkapp.com | Verificar domínio + DKIM/SPF |

---

## 📋 Ordem sugerida de aquisição

**Semana 1 (bloqueadores):**
1. Domínio + Cloudflare + DNS.
2. Submeter **Meta App Review** (leva dias).
3. Criar conta CloudTalk + pedir Phone SDK Partner ID ao suporte.

**Semana 2 (paralelo ao dev):**
4. R2 bucket.
5. Postmark.
6. VPS dev.

**Antes de produção:**
7. Sentry, VPS prod, domínios finais, SSL, backups.

---

## ⚠️ Checklist de segurança das credenciais

- [ ] Nenhum secret no repositório git (usar `.gitignore` no `.env`).
- [ ] `.env.example` sem valores reais, só placeholders.
- [ ] Rotação de `JWT_SECRET` a cada 6 meses (coordenar com refresh tokens).
- [ ] `ENCRYPTION_KEY` **nunca** muda sem migração de re-criptografia.
- [ ] API Keys de CloudTalk/Meta com escopo mínimo.
- [ ] 2FA obrigatório em todas as contas (GitHub, Cloudflare, Meta, CloudTalk, Hetzner, Stripe).
- [ ] Pre-commit hook (`gitleaks` ou `trufflehog`) para detectar secrets vazados.
