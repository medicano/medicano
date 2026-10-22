# syntax=docker/dockerfile:1
# Imagens da API e do front a partir do monorepo.
#   docker build --target api -t medicano-api .
#   docker build --target web --build-arg VITE_API_URL=https://api.medicano.app -t medicano-web .
# Roda em amd64 (VM do homelab, VPS comum) e arm64 (Oracle Ampere, Hetzner CAX).

ARG NODE_VERSION=22

# ---------- dependências e build ----------
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/types packages/types
RUN npm run types:build

FROM build AS api-build
COPY apps/api apps/api
RUN npm run build --workspace=apps/api

FROM build AS web-build
ARG VITE_API_URL=https://api.medicano.app
ENV VITE_API_URL=${VITE_API_URL}
COPY apps/web apps/web
RUN npm run build --workspace=apps/web

# Só as dependências de produção da API (sem React, Vite, jest...).
FROM node:${NODE_VERSION}-bookworm-slim AS api-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
RUN npm ci --omit=dev --no-audit --no-fund --workspace=apps/api --workspace=packages/types

# ---------- API ----------
FROM node:${NODE_VERSION}-bookworm-slim AS api
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=api-deps --chown=node:node /app/node_modules node_modules
COPY --from=api-deps --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/packages/types/package.json packages/types/
COPY --from=build --chown=node:node /app/packages/types/dist packages/types/dist
COPY --from=api-build --chown=node:node /app/apps/api/package.json apps/api/
COPY --from=api-build --chown=node:node /app/apps/api/dist apps/api/dist
# process.cwd() precisa ser apps/api: é onde ficam .env (dev) e uploads/ (fotos).
WORKDIR /app/apps/api
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

# ---------- front (estático) ----------
FROM caddy:2-alpine AS web
COPY deploy/web.Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/apps/web/dist /srv
EXPOSE 80
