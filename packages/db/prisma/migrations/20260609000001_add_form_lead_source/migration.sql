-- Nova fonte de lead para o webhook genérico de formulários/quizz.
-- Leads recebidos via POST /api/webhooks/leads entram com source = 'form',
-- separando-os de 'meta_ads' para não poluir as métricas de Meta no dashboard.
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'form';
