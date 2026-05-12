# Use the builder's native platform for local Docker Compose builds.
# Do not wire the ad-hoc DOCKER_PLATFORM env var into FROM: if it points at an
# architecture Docker cannot execute, even /bin/sh fails with "exec format error".
FROM --platform=$BUILDPLATFORM node:20-slim AS deps
WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/federal_ai_mission_control
COPY package*.json ./
RUN npm ci --ignore-scripts

FROM --platform=$BUILDPLATFORM node:20-slim AS builder
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/federal_ai_mission_control
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM --platform=$BUILDPLATFORM node:20-slim AS runner
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/federal_ai_mission_control
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
EXPOSE 3000
CMD ["sh", "scripts/docker-entrypoint.sh"]
