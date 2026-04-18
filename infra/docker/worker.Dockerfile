# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/cloudtalk-sdk/package.json packages/cloudtalk-sdk/
COPY packages/meta-ads-sdk/package.json packages/meta-ads-sdk/
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY packages/cloudtalk-sdk packages/cloudtalk-sdk
COPY packages/meta-ads-sdk packages/meta-ads-sdk
COPY apps/worker apps/worker
RUN pnpm --filter @callwe/db generate \
 && cd apps/worker && npx tsc --skipLibCheck

FROM node:20-alpine AS runtime
RUN apk add --no-cache tini openssl \
 && npm install -g tsx \
 && addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -D worker
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/package.json ./apps/worker/
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/cloudtalk-sdk ./packages/cloudtalk-sdk
COPY --from=build /app/packages/meta-ads-sdk ./packages/meta-ads-sdk

USER worker
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["tsx", "apps/worker/dist/main.js"]
