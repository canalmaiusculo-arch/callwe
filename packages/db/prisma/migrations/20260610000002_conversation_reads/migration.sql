-- Controle de leitura do chat compartilhado (não lidas por usuário/conversa).
CREATE TABLE "conversation_reads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "last_read_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversation_reads_user_id_lead_id_key" ON "conversation_reads"("user_id", "lead_id");
CREATE INDEX "conversation_reads_user_id_idx" ON "conversation_reads"("user_id");
