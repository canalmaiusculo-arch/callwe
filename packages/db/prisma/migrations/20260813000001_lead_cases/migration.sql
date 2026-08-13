-- Gestão operacional: cada lead vira uma "ficha/caso" com follow-up e resolução.
CREATE TYPE "CaseStatus" AS ENUM ('open', 'follow_up', 'resolved');
CREATE TYPE "CaseOutcome" AS ENUM ('booked', 'won', 'lost');

ALTER TABLE "leads"
  ADD COLUMN "case_status" "CaseStatus" NOT NULL DEFAULT 'open',
  ADD COLUMN "follow_up_at" TIMESTAMPTZ,
  ADD COLUMN "follow_up_reason" TEXT,
  ADD COLUMN "follow_up_user_id" UUID,
  ADD COLUMN "resolved_at" TIMESTAMPTZ,
  ADD COLUMN "resolved_by_user_id" UUID,
  ADD COLUMN "case_outcome" "CaseOutcome",
  ADD COLUMN "resolution_note" TEXT,
  ADD COLUMN "visit_at" TIMESTAMPTZ,
  ADD COLUMN "visit_confirmed" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "leads_sub_account_id_case_status_idx" ON "leads"("sub_account_id", "case_status");

ALTER TABLE "leads" ADD CONSTRAINT "leads_follow_up_user_id_fkey"
  FOREIGN KEY ("follow_up_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_resolved_by_user_id_fkey"
  FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
