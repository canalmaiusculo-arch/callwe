-- Estimativa/orçamento agendado com o lead (data/hora marcada pelo atendente).
ALTER TABLE "leads" ADD COLUMN "scheduled_estimate_at" TIMESTAMPTZ;
CREATE INDEX "leads_scheduled_estimate_at_idx" ON "leads"("scheduled_estimate_at");
