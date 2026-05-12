#!/bin/sh
set -eu

echo "Starting Federal AI Mission Control container"

node <<'NODE'
const net = require("node:net");
const { env } = process;

const databaseUrl = env.DATABASE_URL ?? "postgresql://postgres:postgres@db:5432/federal_ai_mission_control";
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

let url;

try {
  url = new URL(databaseUrl);
} catch {
  console.error(`Invalid DATABASE_URL "${databaseUrl}".`);
  process.exit(1);
}

const host = url.hostname;
const port = Number(url.port || 5432);
const timeoutMs = Number(env.DB_WAIT_TIMEOUT_MS ?? 120000);
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error(`Invalid DB_WAIT_TIMEOUT_MS "${env.DB_WAIT_TIMEOUT_MS}".`);
  process.exit(1);
}

const timeoutAt = Date.now() + timeoutMs;

function waitForDatabase() {
  const socket = net.createConnection({ host, port });
  socket.on("connect", () => {
    socket.end();
    process.exit(0);
  });
  socket.on("error", () => {
    if (Date.now() > timeoutAt) {
      console.error(`Timed out waiting ${timeoutMs}ms for Postgres at ${host}:${port}.`);
      process.exit(1);
    }
    setTimeout(waitForDatabase, 1000);
  });
}

waitForDatabase();
NODE

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@db:5432/federal_ai_mission_control}"

if [ -d prisma/migrations ] && [ "$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)" -gt 0 ]; then
  echo "Running Prisma migrations"
  ./node_modules/.bin/prisma migrate deploy
else
  echo "No Prisma migration files found; syncing schema with prisma db push"
  ./node_modules/.bin/prisma db push --accept-data-loss
fi

if [ "${SEED_ON_START:-auto}" != "false" ]; then
  SHOULD_SEED="$(node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const [aiUseCases, cotsUseCases] = await Promise.all([
      prisma.aiUseCase.count(),
      prisma.cotsUseCase.count()
    ]);
    console.log(aiUseCases === 0 || cotsUseCases === 0 ? "true" : "false");
  } catch {
    console.log("true");
  } finally {
    await prisma.$disconnect();
  }
}

main();
NODE
)"

  if [ "${SEED_ON_START:-auto}" = "true" ] || [ "$SHOULD_SEED" = "true" ]; then
    echo "Seeding OMB inventory from local data/raw CSV files"
    ./node_modules/.bin/tsx prisma/seed.ts
  else
    echo "Seed skipped because analytics tables already contain data"
  fi
else
  echo "Seed skipped because SEED_ON_START=false"
fi

echo "Starting Next.js server"
exec ./node_modules/.bin/next start --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}"
