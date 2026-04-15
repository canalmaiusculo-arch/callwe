# Relatório CloudTalk — O que reaproveitar vs. construir

**Data:** 14/04/2026
**Autor:** Pesquisa automatizada (Claude)
**Objetivo:** Mapear tudo o que a plataforma CloudTalk oferece nativamente para decidir o que reaproveitar em vez de reimplementar num sistema de call center multi-tenant próprio.

---

## 1. Visão Geral da Plataforma

CloudTalk é uma solução SaaS de telefonia/call center (business phone + contact center) com **100+ integrações** nativas, Call Flow Designer visual, AI Conversation Intelligence, AI Voice Agents, Web Dialer embedável, Chrome Extension de click-to-call, API REST pública e webhooks via Workflow Automations.

**Preço (anual):**

| Plano | Preço | Principais limites |
|---|---|---|
| Lite | €19/user/mês | 1–5 chamadas simultâneas, 1 ring group, recording 1 mês |
| Starter | €25/user/mês | Ring groups ilimitados, power dialer add-on |
| Essential | €29/user/mês | Smart dialer, recording ilimitado, 95+ integrações |
| Expert | €49/user/mês (min 3 usuários) | Chamadas simultâneas ilimitadas, Power Dialer incluso, Workflow Designer |

**Add-ons:**
- Power Dialer: €15/user/mês
- Parallel Dialer: €39/user/mês
- **AI Conversation Intelligence: €9/user/mês**
- Branded Caller ID: €0,07/chamada
- **AI Receptionist:** a partir de €99/mês (50 min)
- **AI Specialist:** a partir de €349/mês (1000 min); enterprise €0,15+/min

Sem tier "enterprise" público — volume custom via sales.

---

## 2. Arquitetura Multi-Tenant (CRÍTICO)

### O que existe
- **Roles:** Administrator, Admin Partner (billing-only), Supervisor, Analyst, Agent.
- **Groups** (ring groups, skill-based groups) — agrupamento horizontal de agentes.
- **Tags** em contatos e chamadas.
- **Campaigns** — agrupamento lógico de trabalho.
- **Partner / Reseller Program** — comissão recorrente (até 30% MRR), mas cada cliente final tem **sua própria conta CloudTalk separada**. O reseller não tem painel "master" unificado com subcontas aninhadas.

### O que NÃO existe
- **Não existe hierarquia nativa de subcontas / sub-workspaces dentro de um único workspace CloudTalk.** Um workspace = um tenant fechado.
- **Não há "white-label" real.** O reseller revende contas CloudTalk isoladas, não opera um workspace-mãe com filhos.
- **Admin Partner** cobre apenas billing, não é subconta funcional.

### Implicações para o seu sistema
Você tem três caminhos, em ordem de custo:

**A) Um workspace CloudTalk por cliente final (agência → N workspaces)**
- Pro: isolamento real, faturamento limpo, compliance OK.
- Con: cada workspace custa €19–49/user/mês + números + add-ons. Inviável para agência com muitos clientes pequenos.
- Gestão: precisa orquestrar N API keys no seu backend.

**B) Um único workspace CloudTalk compartilhado + virtualização via tags/groups/custom attributes**
- Pro: custo drasticamente menor.
- Con: **você precisa construir a camada multi-tenant do lado de vocês** (filtros por tag, isolamento visual, permissões). CloudTalk não impede um agente de ver chamadas de outro tenant — o isolamento é cosmético.
- Risco: LGPD/GDPR — dados de clientes diferentes no mesmo workspace.

**C) Híbrido:** workspace CloudTalk por cliente grande, workspace compartilhado com tags para clientes pequenos.

**Recomendação:** **CONSTRUIR DO NOSSO LADO** toda a camada de multi-tenancy (tenant_id, escopo por cliente, RBAC entre tenants, faturamento por cliente). CloudTalk não resolve isso. Use CloudTalk como "telefonia pura" por cliente (opção A para clientes grandes) ou como pool compartilhado com disciplina de tags (opção B para pequenos).

---

## 3. Features Nativas por Área

### 3.1 Calling / Dialing

| Feature | Existe? | Plano |
|---|---|---|
| Voicemail | Sim | Todos |
| 3-Way Calling, Transfer, Hold | Sim | Todos |
| Click-to-Call (Chrome ext.) | Sim | Todos |
| Smart Dialer | Sim | Essential+ |
| Power Dialer | Sim | Expert (add-on €15) |
| Parallel Dialer (até 10 linhas) | Sim | Add-on €39 |
| Voicemail Drop | Sim | Essential+ |
| Campaigns | Sim | Todos |
| Unlimited Concurrent Calls | Só no Expert | Expert |
| Branded Caller ID | Add-on | €0,07/call |

**Recomendação:** **REAPROVEITAR.** Reinventar dialers é caro e pouco diferenciado.

### 3.2 Routing / IVR / Call Flow Designer

| Feature | Detalhe |
|---|---|
| Call Flow Designer | Editor visual drag-and-drop |
| IVR | Multi-nível, DTMF |
| Skill-Based Routing | Sim |
| Preferred Agent | Sim |
| VIP Queues, Caller-Based Routing | Sim |
| Business Hours / Time Route | Sim |
| Callback automatizado | Sim |
| **HTTP Request Step** | **Chave — permite chamar seu backend no meio do fluxo, com "Parse Response" que bloqueia o fluxo esperando retorno. Resposta pode alimentar Condition Splitter para routing dinâmico.** |
| Go to (reuso entre flows) | Expert+ |
| Voice Agent step (AI) | Sim |

**Steps disponíveis:** Call to agent, Call to favorite agent, Call to group, Voice agent, Redirect to external, IVR, Get & dial extension, Collect input (regex), Playback, Voicemail, Call recording, Time Route, Condition splitter, Go to, **HTTP Request**.

**Recomendação:** **REAPROVEITAR** o Call Flow Designer com HTTP Request step apontando para seu backend. Isso é o gancho principal para você injetar lógica de negócio multi-tenant (resolver qual cliente/briefing/script antes de tocar no agente).

### 3.3 Webhook de "Chamada entrante ANTES de tocar" (pop-up de briefing)

**Duas opções viáveis:**

1. **HTTP Request Step no Call Flow Designer com Parse Response = true.** Posiciona esse step antes do "Call to agent/group". Seu backend recebe caller_id + número destino, consulta qual tenant/briefing, retorna payload. O fluxo espera pela resposta. Combinado com Condition Splitter, você pode direcionar dinamicamente.
2. **Evento `ringing` do Phone SDK embed** — dispara no browser do agente quando a ligação chega na UI (já é tarde para um pop-up server-side, mas bom para pop-up no frontend do agente).

**Workflow Automations triggers** (objetos suportados): Call, Message, Contact, User, Recording, Transcription. Mas a documentação pública não expõe a lista exata de eventos por objeto — provável que seja "new call", "call ended", "missed call", "recording uploaded", "transcription ready" etc. **Pipedream/Zapier confirmam:** "New Incoming Call", "New Outgoing Call", "Call Ended", "Missed Call", "Contact Created/Updated".

**Limitação:** Workflow Automations disparam **após** eventos, não **antes** de tocar. Para "antes de tocar" você **precisa** do HTTP Request Step no Call Flow.

**Recomendação:** **INTEGRAR** — use HTTP Request Step no Call Flow Designer como webhook pré-ringing. É a única forma server-side de interceptar com latência baixa antes do toque.

### 3.4 Phone SDK / Embed / Web Dialer

**Embed oficial:**
```html
<iframe src="https://phone.cloudtalk.io?partner=yourappname"
        allow="microphone *" height="700px" width="420px"></iframe>
```

**Eventos via `window.postMessage`:**
- `ringing` — chamada entrante exibida
- `dialing` — agente inicia outbound
- `calling` — chamada atendida
- `hangup` — click em encerrar
- `ended` — sessão finalizada
- `contact_info` — dados do contato disponíveis

**Payload:** `event` + `properties` com `call_uuid`, `external_number`, `internal_number`, dados do contato.

**Limitações do embed:**
- Dimensões mínimas 700x420.
- Precisa rodar em SPA (sem reload).
- Notificações do browser não funcionam em embed.
- **Customização por usuário logado:** o parâmetro `partner` é estático (identificador da sua app), **não é user-specific**. Não há API pública documentada para injetar branding/config por agente. O login do agente acontece dentro do iframe com credenciais CloudTalk (ou SSO).
- Não há estilização/white-label do iframe documentada.

**Alternativas:**
- **Chrome Extension de Click-to-Call** para reconhecer telefones em páginas web.
- **Desktop app** (Windows/Mac) e **mobile** (iOS/Android) nativos.

**Recomendação:**
- **REAPROVEITAR** o iframe embed + eventos postMessage para o painel do agente. Economiza WebRTC/softphone inteiro.
- **CONSTRUIR DO NOSSO LADO** a camada de contexto visual acima do iframe (pop-up de briefing, script dinâmico, painel multi-tenant) ouvindo `ringing`/`calling`/`ended` via postMessage.
- Se precisar de branding/white-label real do softphone, CloudTalk não oferece — teria que construir WebRTC próprio (custo alto).

### 3.5 AI / Conversation Intelligence

| Feature | Nativo? |
|---|---|
| Call Recording | Sim |
| Call Transcription (50+ idiomas, inclui PT) | Sim |
| Sentiment Analysis | Sim |
| Topic Extraction / Trending Topics | Sim |
| Talk/Listen Ratio | Sim |
| Automatic Call Summaries & Tags | Sim |
| Transcript Search | Sim |
| AI Smart Notes | Sim |
| AI Call Scoring | Sim |
| AI Voice Agents (receptionist + specialist) | Sim (produto separado) |

**Custo:** €9/user/mês (add-on). Suporta PT-BR, EN, DE, ES, FR + 45 outros. Transcrições não-inglesas são traduzidas internamente para EN para rodar nos LLMs e depois retraduzidas.

**API:** CI data é exportável via API REST (tag "Conversation Intelligence" no swagger, mas endpoints truncados na doc pública).

**Recomendação:** **REAPROVEITAR.** Construir Whisper + pipeline de sentiment/topics/scoring próprio custaria meses e provavelmente ficaria pior. €9/user é competitivo. **Só considere Whisper/OpenAI próprio se:** (a) você quer reter áudio/transcrição em infra própria por compliance, (b) você precisa de prompts customizados por tenant que o CloudTalk não expõe, ou (c) você vai escalar para volumes onde €9/user fica caro.

### 3.6 Números, SMS, WhatsApp

- Números internacionais em 160+ países, toll-free, number porting.
- SMS inbound/outbound (API `/sms/send`).
- **WhatsApp inbound e outbound** nativo.
- Virtual Caller ID, Branded Caller ID, STIR/SHAKEN, Spam Protection.

**Recomendação:** **REAPROVEITAR** números e SMS/WhatsApp. Provisionar DIDs e compliance telco é pesadelo.

### 3.7 Analytics / Monitoring

- Real-Time Dashboard, Wallboard, Agent Reporting, Group Reporting, Call Monitoring (listen/whisper/barge presumível), Missed Calls, Agent Status.

**Recomendação:** **INTEGRAR** — consuma via API os dados brutos de calls/agents e renderize no seu painel multi-tenant (filtrando por tag de tenant). O dashboard nativo do CloudTalk não é filtrável por "subconta virtual".

### 3.8 Compliance / Security

- SSO (Google, Azure, Okta, Keycloak, OneLogin)
- STIR/SHAKEN, Spam Protection
- Recording retention (1 mês Lite/Starter, ilimitado Essential+)

---

## 4. API REST Pública

**Base (inferida):** `https://my.cloudtalk.io/api/` (endpoints estilo `/agents/index.json`, padrão CakePHP-ish).

**Autenticação:** API Key (gerada em Settings). Headers estáticos (Basic ou Bearer). Documentação pública renderiza mal em scraping — recomendo baixar o swagger.json direto.

**Rate limits:** **Não publicados explicitamente.** Apenas referência genérica a "standard rate limits". Assuma ~60 req/min por API key como padrão conservador e implemente backoff/cache.

### Endpoints confirmados (via swagger parcial)

| Path | Método | Recurso |
|---|---|---|
| `/cuecards` | POST | CueCards (pop-up no softphone do agente) |
| `/agents/index.json` | GET | Listar agentes |
| `/agents/add.json` | PUT | Criar agente |
| `/agents/edit/{agentId}.json` | POST | Editar |
| `/agents/delete/{agentId}.json` | DELETE | Remover |
| `/groups/index.json` | GET | Grupos |
| `/groups/add.json` | PUT | Criar grupo |
| `/groups/delete/{agent_id}.json` | DELETE | Remover |
| `/bulk/contacts.json` | POST | Import em lote |
| `/campaigns/index.json` | GET | Campanhas |
| `/campaigns/add.json` | PUT | Criar |
| `/campaigns/edit/{id}.json` | POST | Editar |
| `/campaigns/delete/{id}.json` | DELETE | Remover |
| `/contacts/index.json` | GET | Listar |
| `/contacts/add.json` | PUT | Criar |
| `/contacts/edit/{contactId}.json` | POST | Editar |
| `/contacts/delete/{contactId}.json` | DELETE | Remover |
| `/contacts/show/{contactId}.json` | GET | Detalhe |
| `/contacts/attributes.json` | GET | Atributos custom |
| `/contacts/addTags/{contactId}.json` | POST/PUT | Adicionar tags |

**Tags adicionais mencionadas no swagger mas paths truncados:** Calls, Numbers, SMS, Tags, Conversation Intelligence, VoiceAgent, Other.

**CueCards API** (`POST /cuecards`) — este é o endpoint para **injetar pop-ups no softphone do agente em tempo real**. É útil para briefing multi-tenant: seu backend recebe o HTTP Request Step do Call Flow, descobre o tenant/contexto, e chama `POST /cuecards` para mostrar o briefing no softphone do agente escolhido.

**Recomendação:** **INTEGRAR.** A API cobre CRUD básico do que importa (agents, groups, contacts, campaigns, tags, calls, SMS, CueCards). Baixe o swagger.json completo (`https://developers.cloudtalk.io/swagger.json`) e gere client em TS/Python.

---

## 5. Webhooks

### Via Workflow Automations (nativo)

**Triggers (objetos suportados):** Call, Message, Contact, User, Recording, Transcription.

**Eventos individuais (confirmados via Zapier/Pipedream):**
- New Incoming Call
- New Outgoing Call
- Call Ended
- Missed Call
- Contact Created
- Contact Updated
- Recording Uploaded (dispara Speech-to-Text via action)

**Ações disponíveis a partir de um trigger:**
- API Request (HTTP customizado)
- Send SMS
- Send Notification to Slack
- Speech to Text (apenas a partir de Recording Uploaded)

**Limitação crítica:** Workflow Automations são **pós-evento**. Não há trigger "incoming call ANTES de tocar". Para esse caso → **HTTP Request Step no Call Flow Designer**.

### Documentação pública de payload

**Não há página pública única listando todos os webhook payloads**. Payloads incluem (confirmado): call_uuid, timestamps, caller IDs, duração, external/internal numbers, contact info. Para detalhes finos, precisa testar com webhook.site ou ler swagger completo.

**Recomendação:** **INTEGRAR.** Configure Workflow Automations para disparar para seu backend em `call.ended`, `recording.uploaded`, `transcription.ready`, `missed_call`. Use HTTP Request Step do Call Flow Designer para o caso pré-ring.

---

## 6. Integrações Nativas Relevantes

### CRM
Salesforce, **HubSpot (certificado)**, **Pipedrive**, Zoho, MS Dynamics, Odoo, Copper, noCRM, Kommo, Close, Capsule, Bullhorn, Monday, Workable, Greenhouse.

### Helpdesk
Zendesk, Intercom, Freshdesk, Zoho Desk, Kustomer, Front, LiveAgent, Help Scout, Gorgias.

### Sales/Marketing
Outreach, Salesloft, ActiveCampaign, Freshsales, Zendesk Sell.

### E-commerce
Shopify, BigCommerce, Adobe Commerce.

### Automation
**Zapier, Make, Pabbly, Pipedream.**

### Outros
MS Teams, Gong, Krisp, Playvox, Mindtickle, Dataddo.

### Meta Ads / Facebook Lead Ads
**NÃO existe integração nativa CloudTalk ↔ Facebook Lead Ads.** Teria que ir via Zapier/Make: Facebook Lead Ads → Zapier → CloudTalk (criar contato + disparar campanha).

**Recomendação:**
- **REAPROVEITAR** HubSpot e Pipedrive nativos (sync bidirecional pronto).
- **CONSTRUIR DO NOSSO LADO** a ponte Meta Ads → CloudTalk (webhook direto do Meta para seu backend, cria contato via API CloudTalk, trigga campanha/power dialer). Evita dependência de Zapier e permite enriquecer o lead com contexto multi-tenant antes de entrar no dialer.

---

## 7. Resumo executivo por pergunta crítica

| Pergunta | Resposta |
|---|---|
| Existe hierarquia nativa de subcontas? | **Não.** Um workspace = um tenant. Virtualize via tags/groups/custom attributes **OU** um workspace por cliente. |
| Phone SDK customizável por usuário logado? | **Não.** O iframe aceita `partner=` global. Login por usuário acontece dentro do iframe. Branding/white-label não suportado. |
| Webhook "incoming call antes de tocar"? | **Não como webhook tradicional.** Solução: **HTTP Request Step no Call Flow Designer com Parse Response=true** (bloqueia até seu backend responder). |
| Rate limits da API? | Não publicados. Assuma conservador (~60 rpm) + backoff. |
| Transcrição e sentimento prontos? | **Sim**, add-on €9/user/mês, 50+ idiomas incluindo PT-BR. Não precisa montar Whisper/OpenAI — a menos que queira infra própria por compliance. |
| Integração nativa Meta/Facebook Lead Ads? | **Não.** Via Zapier/Make ou integração própria. |
| Integração HubSpot/Pipedrive nativa? | **Sim**, bidirecional. |

---

## 8. RESUMO FINAL: Reaproveitar vs. Construir

### REAPROVEITAR (usar direto via CloudTalk)
- **Telefonia core:** PSTN, DIDs, toll-free, number porting, 160+ países.
- **WebRTC softphone:** embed iframe `phone.cloudtalk.io` + eventos postMessage.
- **Chrome Extension** de click-to-call para CRMs.
- **Call Flow Designer** (IVR, skill routing, VIP, time route, callbacks).
- **Dialers:** Smart, Power, Parallel, Voicemail Drop.
- **Campaigns** (outbound).
- **SMS + WhatsApp** in/out.
- **Call Recording** + retention.
- **AI Conversation Intelligence** (€9/user): transcrição, sentimento, topics, summaries, scoring.
- **AI Voice Agents** (se fizer sentido o custo).
- **STIR/SHAKEN, Spam Protection, SSO.**
- **Integrações HubSpot e Pipedrive** nativas.

### INTEGRAR (consumir via API/Webhooks)
- **API REST** para CRUD de agents, groups, contacts, campaigns, tags, calls, SMS.
- **CueCards API** para pop-ups server-side no softphone.
- **HTTP Request Step** no Call Flow como "pre-ring webhook" para resolver tenant/briefing antes de tocar.
- **Workflow Automations** disparando para seu backend em `call.ended`, `recording.uploaded`, `transcription.ready`, `missed_call`.
- **Dados de analytics** para renderizar no seu painel filtrado por tenant.

### CONSTRUIR DO NOSSO LADO
- **Camada multi-tenant completa:** tenant_id, RBAC entre tenants, isolamento de dados, faturamento por cliente. CloudTalk não resolve.
- **Painel do agente (wrapper)** que hospeda o iframe CloudTalk + injeta briefing dinâmico, script por tenant, contexto do lead.
- **Painel admin/agência** (visão consolidada entre tenants) — CloudTalk só entrega visão por workspace.
- **Integração Meta Ads / Facebook Lead Ads** → backend próprio → CloudTalk API.
- **Atribuição de leads a sub-contas virtuais** via tags CloudTalk disciplinadas.
- **Billing multi-tenant** (repassar custo CloudTalk por cliente, markup, subscription management).
- **Gravações duplicadas em infra própria** se compliance exigir (CloudTalk guarda, mas você pode querer cópia).
- **Orquestrador de API keys** se optar pelo modelo "1 workspace CloudTalk por cliente".
- **Relatórios cross-tenant** para a agência (agregando analytics via API).

### DECISÃO ESTRATÉGICA RECOMENDADA
Use CloudTalk como **"telefonia-como-serviço"** abaixo do seu produto. Sua aplicação fica sendo: (1) a camada multi-tenant, (2) o painel unificado de agência, (3) a integração Meta Ads e lógica de negócio própria, (4) o wrapper visual em cima do iframe/softphone. Isso entrega MVP rápido, foca seu esforço no diferencial (multi-tenant de agência + Meta Ads), e deixa telefonia/AI/compliance nas mãos de quem faz isso bem.

---

## Fontes consultadas
- https://www.cloudtalk.io/features/
- https://www.cloudtalk.io/integrations/
- https://www.cloudtalk.io/pricing/
- https://www.cloudtalk.io/cloudtalk-ai/
- https://www.cloudtalk.io/web-dialer/
- https://www.cloudtalk.io/click-to-call/
- https://www.cloudtalk.io/reseller-partners/
- https://developers.cloudtalk.io/
- https://developers.cloudtalk.io/swagger.json
- https://help.cloudtalk.io/en/articles/3669429-call-flow-designer-guide
- https://help.cloudtalk.io/en/articles/6883940-http-request-step
- https://help.cloudtalk.io/en/articles/5649782-actions
- https://help.cloudtalk.io/en/articles/5450779-configuring-workflow-automations
- https://help.cloudtalk.io/en/articles/9241618-users
- https://help.cloudtalk.io/en/articles/9128167-conversation-intelligence
- https://help.cloudtalk.io/en/articles/11791061-embedding-cloudtalk-phone-in-a-web-application
- https://apitracker.io/a/cloudtalk-io
- https://pipedream.com/apps/cloudtalk
- https://zapier.com/apps/cloudtalk
