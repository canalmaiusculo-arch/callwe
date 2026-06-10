-- Notas do lead ganham visibilidade (interna vs compartilhada com o cliente) e o papel do autor.
-- Notas existentes ficam internas por padrão (shared = false) — não vazam para o cliente.
ALTER TABLE "lead_notes" ADD COLUMN "shared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lead_notes" ADD COLUMN "author_role" TEXT;
