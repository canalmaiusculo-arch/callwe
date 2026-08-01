-- Messenger / Instagram DM: novo canal de atendimento no call center.

-- Nova fonte de lead (contatos que chegam por Messenger viram leads).
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'messenger';

-- Canal da conversa (Messenger do Facebook ou Direct do Instagram).
CREATE TYPE "MessengerChannel" AS ENUM ('messenger', 'instagram');

-- Páginas habilitadas para receber/responder mensagens.
CREATE TABLE "messenger_pages" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "sub_account_id" UUID NOT NULL,
    "page_id" TEXT NOT NULL,
    "page_name" TEXT NOT NULL,
    "channel" "MessengerChannel" NOT NULL DEFAULT 'messenger',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messenger_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "messenger_pages_page_id_key" ON "messenger_pages"("page_id");
CREATE INDEX "messenger_pages_sub_account_id_idx" ON "messenger_pages"("sub_account_id");

-- Uma conversa por (página, usuário PSID).
CREATE TABLE "messenger_conversations" (
    "id" UUID NOT NULL,
    "sub_account_id" UUID NOT NULL,
    "page_id" TEXT NOT NULL,
    "psid" TEXT NOT NULL,
    "channel" "MessengerChannel" NOT NULL DEFAULT 'messenger',
    "lead_id" UUID,
    "contact_name" TEXT,
    "contact_avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "last_message_at" TIMESTAMPTZ,
    "last_message_text" TEXT,
    "last_inbound_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "messenger_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "messenger_conversations_page_id_psid_key" ON "messenger_conversations"("page_id", "psid");
CREATE INDEX "messenger_conversations_sub_account_id_last_message_at_idx" ON "messenger_conversations"("sub_account_id", "last_message_at" DESC);

-- Mensagens de cada conversa.
CREATE TABLE "messenger_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "mid" TEXT,
    "direction" "InteractionDirection" NOT NULL,
    "text" TEXT,
    "attachments" JSONB,
    "sender_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messenger_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "messenger_messages_mid_key" ON "messenger_messages"("mid");
CREATE INDEX "messenger_messages_conversation_id_created_at_idx" ON "messenger_messages"("conversation_id", "created_at");

-- Foreign keys
ALTER TABLE "messenger_pages" ADD CONSTRAINT "messenger_pages_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messenger_pages" ADD CONSTRAINT "messenger_pages_sub_account_id_fkey" FOREIGN KEY ("sub_account_id") REFERENCES "sub_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messenger_conversations" ADD CONSTRAINT "messenger_conversations_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "messenger_pages"("page_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messenger_conversations" ADD CONSTRAINT "messenger_conversations_sub_account_id_fkey" FOREIGN KEY ("sub_account_id") REFERENCES "sub_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messenger_conversations" ADD CONSTRAINT "messenger_conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messenger_messages" ADD CONSTRAINT "messenger_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "messenger_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messenger_messages" ADD CONSTRAINT "messenger_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
