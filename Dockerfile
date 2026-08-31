# syntax=docker/dockerfile:1.7

# ─── Builder ────────────────────────────────────────────────────────────
# Full toolchain: dev deps, Nest CLI, TypeScript. Compiles src/ → dist/ so
# the runtime image can boot with plain `node dist/main`.
FROM node:22-alpine AS builder

WORKDIR /app

# Deterministic install — include devDependencies (@nestjs/cli, typescript,
# ts-node needed by the typeorm CLI for local runs but not at container boot).
COPY package*.json ./
RUN npm ci --include=dev

# Copy the rest and compile. The sanity-check ensures the entrypoint we CMD
# below actually exists; catches broken tsconfig / missing files at build time
# instead of at container start.
COPY . .
RUN npm run build && test -f /app/dist/main.js


# ─── Runtime ────────────────────────────────────────────────────────────
# Slim production image. No dev deps, no source, no tests. Ships only what
# `node dist/main` needs, plus the compiled TypeORM CLI so we can apply
# migrations at boot.
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# tini as PID 1 forwards SIGTERM cleanly on Railway redeploys — without it,
# graceful shutdown (enableShutdownHooks in main.ts) never gets a chance and
# in-flight requests die mid-response.
RUN apk add --no-cache tini

# Prod-only install; smaller image, fewer CVEs. `typeorm` is a runtime
# dependency of the app, so its CLI (node_modules/typeorm/cli.js) is available
# for `migration:run` at boot.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled app (contains modules/**/*.orm-entity.js and the migrations dir
# the data-source globs will match at runtime).
COPY --from=builder /app/dist ./dist

# Railway assigns $PORT at run time; main.ts already reads it via ConfigService
# and we bind 0.0.0.0 so the container's network namespace routes requests in.
EXPOSE 3000

# tini → sh → typeorm migration:run → node.
# sh -c so && chains; tini forwards signals down to whatever ends up as PID 2.
# migration:run is idempotent (only unapplied migrations execute), so this is
# safe to run on every boot.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js migration:run -d dist/shared/infrastructure/persistence/data-source.js && node dist/main"]
