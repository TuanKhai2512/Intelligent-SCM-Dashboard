FROM node:22-alpine AS base
RUN apk add --no-cache openssl && corepack enable
# Plain copies: pnpm's default hard-link/clone import is ~60x slower on Docker Desktop (overlayfs)
ENV npm_config_package_import_method=copy
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @ims/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @ims/api exec prisma generate \
 && pnpm --filter @ims/shared build \
 && pnpm --filter @ims/api build \
 && pnpm --filter @ims/api deploy --prod --legacy /out \
 && cd /out && ./node_modules/.bin/prisma generate

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
COPY --chown=node:node apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
