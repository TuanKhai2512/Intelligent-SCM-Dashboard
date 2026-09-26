FROM node:22-alpine AS build
RUN corepack enable
# Plain copies: pnpm's default hard-link/clone import is ~60x slower on Docker Desktop (overlayfs)
ENV npm_config_package_import_method=copy
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @ims/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @ims/web build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
