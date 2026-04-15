-- =====================================================
-- Row Level Security (RLS) — isolamento multi-tenant
--
-- Estratégia: o backend abre cada transação com
--   SET LOCAL app.current_sub_account_id = '<uuid>';
-- As policies abaixo garantem que queries só enxerguem
-- linhas da subconta atual. Se o setting não estiver
-- definido (NULL), nenhuma linha é retornada.
--
-- O role usado pelo app NÃO deve ter BYPASSRLS.
-- Migrations e jobs administrativos usam um role separado.
-- =====================================================

-- Helper para ler o setting de forma segura (retorna NULL se não setado)
CREATE OR REPLACE FUNCTION app_current_sub_account()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_sub_account_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- =====================================================
-- Tabelas com isolamento direto via sub_account_id
-- =====================================================

ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_revisions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_lead_forms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloudtalk_agents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters        ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON leads
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON interactions
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON briefings
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON briefing_revisions
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON integrations
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON meta_lead_forms
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON phone_numbers
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON cloudtalk_agents
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON routing_rules
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON sla_policies
  USING (sub_account_id = app_current_sub_account());

CREATE POLICY tenant_isolation ON usage_counters
  USING (sub_account_id = app_current_sub_account());

-- =====================================================
-- Tabelas que herdam o tenant via FK (lead_notes, events, access_logs)
-- =====================================================

ALTER TABLE lead_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_access_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON lead_notes
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_notes.lead_id
        AND l.sub_account_id = app_current_sub_account()
    )
  );

CREATE POLICY tenant_isolation ON interaction_events
  USING (
    EXISTS (
      SELECT 1 FROM interactions i
      WHERE i.id = interaction_events.interaction_id
        AND i.sub_account_id = app_current_sub_account()
    )
  );

CREATE POLICY tenant_isolation ON recording_access_logs
  USING (
    EXISTS (
      SELECT 1 FROM interactions i
      WHERE i.id = recording_access_logs.interaction_id
        AND i.sub_account_id = app_current_sub_account()
    )
  );

-- =====================================================
-- audit_logs: permitir filtrar por sub_account_id OU registros globais (NULL)
-- =====================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON audit_logs
  USING (
    sub_account_id IS NULL
    OR sub_account_id = app_current_sub_account()
  );

-- =====================================================
-- Observação: agencies, sub_accounts, users, memberships, sessions,
-- webhook_inbox — NÃO têm RLS. Acesso é controlado na camada de app
-- (endpoints admin restritos por role). Isso é intencional:
-- o TenantGuard só se aplica a rotas com contexto de subconta.
-- =====================================================
