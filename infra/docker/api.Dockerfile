# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/cloudtalk-sdk/package.json packages/cloudtalk-sdk/
COPY packages/meta-ads-sdk/package.json packages/meta-ads-sdk/
RUN pnpm install --no-frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY packages/cloudtalk-sdk packages/cloudtalk-sdk
COPY packages/meta-ads-sdk packages/meta-ads-sdk
COPY apps/api apps/api
RUN pnpm --filter @callwe/db generate \
 && cd apps/api && npx tsc --project tsconfig.build.json

# ---------- runtime ----------
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate \
 && apk add --no-cache tini curl openssl \
 && npm install -g tsx \
 && addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -D nestjs
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/cloudtalk-sdk ./packages/cloudtalk-sdk
COPY --from=build /app/packages/meta-ads-sdk ./packages/meta-ads-sdk

USER nestjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:4000/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["tsx", "apps/api/dist/main.js"]
