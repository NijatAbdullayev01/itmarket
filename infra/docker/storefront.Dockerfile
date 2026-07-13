# syntax=docker/dockerfile:1.7

FROM node:22.17.0-alpine3.21 AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true
RUN corepack enable
WORKDIR /workspace

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY apps/backoffice/package.json apps/backoffice/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json

FROM manifests AS development-dependencies
RUN pnpm install --frozen-lockfile

FROM development-dependencies AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm --filter @itmarket/storefront build

FROM node:22.17.0-alpine3.21 AS runtime
ARG RELEASE_SHA=unknown
ENV NODE_ENV=production
ENV RELEASE_SHA=$RELEASE_SHA
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
RUN addgroup -S -g 10001 itmarket \
    && adduser -S -D -H -u 10001 -G itmarket itmarket
COPY --from=build --chown=itmarket:itmarket /workspace/apps/storefront/.next/standalone ./
COPY --from=build --chown=itmarket:itmarket /workspace/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=itmarket:itmarket /workspace/apps/storefront/public ./apps/storefront/public
USER itmarket
WORKDIR /app/apps/storefront
EXPOSE 3000
CMD ["node", "server.js"]
