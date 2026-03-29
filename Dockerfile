# =============================================================================
# loschke-chat — Multi-stage Dockerfile for EU/Local Self-Hosting
# =============================================================================
#
# Build:  docker build -t loschke-chat .
# Run:    docker-compose up (see docker-compose.yml)
#
# Uses Next.js standalone output for minimal image size (~200MB vs ~1GB).

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# ---------------------------------------------------------------------------
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Enable standalone output for Docker
ENV NEXT_OUTPUT_MODE=standalone
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 3: Runtime
# ---------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy seed data and drizzle migrations
COPY --from=builder /app/seeds ./seeds
COPY --from=builder /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
