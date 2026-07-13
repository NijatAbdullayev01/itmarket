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

FROM manifests AS production-dependencies
RUN pnpm install --frozen-lockfile --prod

FROM development-dependencies AS build
COPY . .
RUN pnpm --filter @itmarket/api build

FROM node:22.17.0-alpine3.21 AS runtime
ARG RELEASE_SHA=unknown
ENV NODE_ENV=production
ENV RELEASE_SHA=$RELEASE_SHA
WORKDIR /app
RUN addgroup -S -g 10001 itmarket \
    && adduser -S -D -H -u 10001 -G itmarket itmarket
COPY --from=production-dependencies --chown=itmarket:itmarket /workspace/node_modules ./node_modules
COPY --from=production-dependencies --chown=itmarket:itmarket /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=itmarket:itmarket /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=itmarket:itmarket /workspace/apps/api/package.json ./apps/api/package.json
USER itmarket
WORKDIR /app/apps/api
EXPOSE 3001
ENTRYPOINT ["node"]
CMD ["dist/main.js"]
