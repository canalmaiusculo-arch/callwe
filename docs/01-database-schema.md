# Schema do Banco de Dados — PostgreSQL

Multi-tenant com isolamento via `sub_account_id` em toda tabela de negócio + Row Level Security (RLS) no Postgres para defesa em profundidade.

## Convenções

- PKs: `uuid` (gen_random_uuid()).
- Timestamps: `created_at`, `updated_at` em toda tabela.
- Soft delete: `deleted_at nullable` nas entidades centrais (leads, users).
- Todo lookup de tenant passa por `sub_account_id` indexado.
- Nomes em `snake_case`, tabelas no plural.

---

## 1. Hierarquia e acesso

### `agencies`
A agência (sua empresa ou um revendedor).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| name | text | |
| slug | text unique | subdomínio `slug.callwe.app` |
| billing_email | text | |
| status | enum(active, suspended) | |
| cloudtalk_workspace_id | text nullable | se agência tiver workspace dedicado |
| settings | jsonb | branding, limites |
| created_at / updated_at | timestamptz | |

### `sub_accounts`
Cada cliente final da agência.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| agency_id | uuid FK agencies | |
| name | text | "Clínica X" |
| slug | text | único dentro da agência |
| cloudtalk_tag | text | tag que marca chamadas desta subconta no workspace CloudTalk (`sub:UUID`) |
| cloudtalk_group_id | text nullable | ring group correspondente |
| timezone | text default 'America/Sao_Paulo' | |
| status | enum(active, paused, archived) | |
| plan | enum(starter, pro, enterprise) | |
| settings | jsonb | preferências, limites de usuários/números |
| created_at / updated_at | timestamptz | |

Índices: `(agency_id, slug)` unique, `cloudtalk_tag` unique.

### `users`
Usuários do sistema (qualquer papel).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| email | text unique | |
| password_hash | text | argon2id |
| full_name | text | |
| avatar_url | text nullable | |
| status | enum(active, invited, disabled) | |
| mfa_secret | text nullable | TOTP |
| last_login_at | timestamptz nullable | |
| created_at / updated_at | timestamptz | |

### `memberships`
Associação N:N entre user e agency/subaccount com papel.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK users | |
| agency_id | uuid FK agencies nullable | |
| sub_account_id | uuid FK sub_accounts nullable | |
| role | enum(super_admin, agency_admin, sub_account_admin, agent, client_viewer) | |
| cloudtalk_agent_id | text nullable | se for atendente, id no CloudTalk |
| created_at / updated_at | timestamptz | |

Regra: se `role` in (super_admin, agency_admin) → exige `agency_id`. Demais → exigem `sub_account_id`.

### `sessions`
JWT é stateless; guardamos refresh tokens e device info para revogação.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| refresh_token_hash | text | |
| ip | inet | |
| user_agent | text | |
| expires_at | timestamptz | |
| revoked_at | timestamptz nullable | |

---

## 2. CRM / Leads

### `leads`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| sub_account_id | uuid FK | RLS |
| source | enum(inbound_call, outbound_call, meta_ads, sms, manual, import, api) | |
| source_ref | text nullable | ex: `fb_lead:<leadgen_id>` |
| status | enum(new, contacted, qualified, won, lost) default 'new' | |
| lost_reason | text nullable | |
| owner_user_id | uuid FK users nullable | atendente responsável |
| name | text nullable | |
| phone_e164 | text nullable | |
| email | text nullable | |
| custom_fields | jsonb default '{}' | campos específicos da subconta |
| utm | jsonb nullable | utm_source/medium/campaign |
| tags | text[] default '{}' | |
| first_contact_at | timestamptz nullable | |
| last_contact_at | timestamptz nullable | |
| created_at / updated_at / deleted_at | timestamptz | |

Índices: `(sub_account_id, phone_e164)`, `(sub_account_id, status)`, GIN em `tags`, GIN em `custom_fields`.

### `lead_notes`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| lead_id | uuid FK | |
| author_user_id | uuid FK users | |
| body | text | |
| created_at | timestamptz | |

---

## 3. Interações (chamadas, SMS, voicemail, form)

### `interactions`
Tabela única polimórfica para toda comunicação.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| sub_account_id | uuid FK | RLS |
| lead_id | uuid FK nullable | pode haver interação sem lead ainda (p.ex. chamada perdida) |
| type | enum(call, sms, voicemail, meta_form) | |
| direction | enum(inbound, outbound) | |
| status | enum(initiated, ringing, answered, missed, failed, completed) | |
| started_at | timestamptz | |
| ended_at | timestamptz nullable | |
| duration_seconds | int nullable | |
| from_number | text nullable | |
| to_number | text nullable | |
| agent_user_id | uuid FK users nullable | |
| cloudtalk_call_id | text nullable unique | |
| cloudtalk_sms_id | text nullable unique | |
| recording_url | text nullable | S3/R2 após sincronização |
| recording_synced_at | timestamptz nullable | |
| transcript | text nullable | |
| transcript_provider | enum(cloudtalk_ai, whisper, none) nullable | |
| sentiment | enum(positive, neutral, negative) nullable | |
| ai_summary | text nullable | |
| ai_topics | text[] nullable | |
| ai_score | int nullable | 0-100 |
| sms_body | text nullable | |
| metadata | jsonb default '{}' | payload bruto do webhook para auditoria |
| created_at / updated_at | timestamptz | |

Índices: `(sub_account_id, started_at desc)`, `(lead_id, started_at)`, `(agent_user_id, started_at)`, `cloudtalk_call_id`, `(type, status)`.

### `interaction_events`
Timeline granular (start, ring, answer, transfer, hangup) útil para auditoria e replay.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| interaction_id | uuid FK | |
| event | text | ringing, answered, transferred, hung_up, recording_ready |
| payload | jsonb | |
| occurred_at | timestamptz | |

### `recording_access_logs`
LGPD — quem ouviu o quê.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| interaction_id | uuid FK | |
| user_id | uuid FK | |
| ip | inet | |
| accessed_at | timestamptz | |

---

## 4. Telefonia / CloudTalk mapping

### `phone_numbers`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| sub_account_id | uuid FK | |
| cloudtalk_number_id | text unique | |
| e164 | text unique | |
| country | text | |
| label | text nullable | "Vendas", "SAC" |
| monthly_cost_cents | int nullable | |
| status | enum(active, released) | |
| purchased_at | timestamptz | |

### `cloudtalk_agents`
Espelho dos agentes CloudTalk ↔ users.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| sub_account_id | uuid FK | agente pode ser por subconta ou compartilhado (agency) |
| cloudtalk_agent_id | text unique | |
| cloudtalk_extension | text | |
| availability | enum(online, offline, busy, away) | |
| updated_at | timestamptz | |

---

## 5. Briefing do cliente

### `briefings`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| sub_account_id | uuid FK unique | um briefing por subconta (ou versionar) |
| business_summary | text | O que a empresa faz |
| target_audience | text | |
| key_services | jsonb | lista estruturada |
| pricing_guidelines | text nullable | |
| faq | jsonb | [{q, a}] |
| scripts | jsonb | {opening, objection_handling, closing} |
| dos_and_donts | jsonb | |
| updated_by | uuid FK users | |
| version | int default 1 | |
| created_at / updated_at | timestamptz | |

### `briefing_revisions`
Histórico (auditoria e rollback).

---

## 6. Meta Ads / integrações externas

### `integrations`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| sub_account_id | uuid FK | |
| provider | enum(meta_ads, whatsapp_cloud, google_ads, zapier) | |
| status | enum(connected, disconnected, error) | |
| credentials | jsonb encrypted | token criptografado com KMS/pgcrypto |
| settings | jsonb | page_ids, form_ids selecionados |
| last_sync_at | timestamptz nullable | |
| last_error | text nullable | |
| created_at / updated_at | timestamptz | |

Unique: `(sub_account_id, provider)`.

### `meta_lead_forms`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| integration_id | uuid FK | |
| sub_account_id | uuid FK | |
| page_id | text | |
| form_id | text | |
| form_name | text | |
| enabled | bool default true | |
| field_mapping | jsonb | map campos do form → campos do lead |

---

## 7. Routing / distribuição

### `routing_rules`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| sub_account_id | uuid FK | |
| name | text | |
| priority | int | |
| conditions | jsonb | ex: {channel: 'call', hours: '9-18'} |
| strategy | enum(round_robin, least_busy, skill_based, sticky_owner) | |
| target_user_ids | uuid[] | |
| fallback_strategy | enum(voicemail, overflow_group) | |
| enabled | bool default true | |

### `sla_policies`
Alerta se lead não for atendido em N minutos.

---

## 8. Webhooks e filas

### `webhook_inbox`
Toda chamada de webhook (CloudTalk, Meta) é gravada crua ANTES de processar. Garante replay e audit.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| provider | enum(cloudtalk, meta, twilio) | |
| event_type | text | |
| signature_valid | bool | |
| headers | jsonb | |
| body | jsonb | |
| processed_at | timestamptz nullable | |
| processing_error | text nullable | |
| received_at | timestamptz | |

### `outbound_webhooks`
Se cliente quiser receber eventos nossos.

---

## 9. Billing (desde o início, simples)

### `usage_counters`
Contador agregado por subconta/mês (chamadas, minutos, SMS, números ativos).

| coluna | tipo | notas |
|---|---|---|
| sub_account_id | uuid FK | |
| period | date | primeiro dia do mês |
| inbound_minutes | int default 0 | |
| outbound_minutes | int default 0 | |
| sms_count | int default 0 | |
| active_numbers | int default 0 | |
| ai_minutes | int default 0 | |

PK composta: `(sub_account_id, period)`.

---

## 10. Auditoria genérica

### `audit_logs`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| actor_user_id | uuid FK nullable | null = sistema |
| sub_account_id | uuid FK nullable | |
| action | text | `lead.updated`, `recording.accessed` |
| resource_type | text | |
| resource_id | uuid nullable | |
| diff | jsonb nullable | before/after |
| ip | inet | |
| created_at | timestamptz | |

---

## RLS (Row Level Security)

Ativar em: `leads`, `interactions`, `lead_notes`, `briefings`, `integrations`, `phone_numbers`, `routing_rules`, `meta_lead_forms`, `interaction_events`, `recording_access_logs`, `audit_logs`.

Política base:
```sql
CREATE POLICY tenant_isolation ON leads
  USING (sub_account_id = current_setting('app.current_sub_account_id')::uuid);
```

Backend seta `SET LOCAL app.current_sub_account_id = '...'` no início de cada request dentro da transação.

---

## Diagrama resumido

```
agencies 1─* sub_accounts 1─* phone_numbers
                │         1─* briefings
                │         1─* integrations 1─* meta_lead_forms
                │         1─* leads 1─* interactions *─1 users (agent)
                │                  1─* lead_notes
                │                         │
                │                  interactions 1─* interaction_events
                │                               1─* recording_access_logs
                │
users *─* memberships *─1 (agencies | sub_accounts)
users 1─* cloudtalk_agents *─1 sub_accounts
```
