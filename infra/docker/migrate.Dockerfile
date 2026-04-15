# syntax=docker/dockerfile:1.7
# Imagem leve apenas para rodar `prisma migrate deploy` antes do app subir.
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/db packages/db
RUN pnpm install --frozen-lockfile --filter @callwe/db \
 && pnpm --filter @callwe/db generate

CMD ["pnpm", "--filter", "@callwe/db", "migrate:deploy"]
