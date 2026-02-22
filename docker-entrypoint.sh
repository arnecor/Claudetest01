#!/bin/sh
set -e

echo "[entrypoint] Waiting for the database to be ready..."
until npx prisma db execute --stdin <<'SQL' 2>/dev/null
SELECT 1;
SQL
do
  echo "[entrypoint] Database not ready – retrying in 3 s..."
  sleep 3
done

echo "[entrypoint] Syncing database schema (prisma db push)..."
npx prisma db push --accept-data-loss

echo "[entrypoint] Starting Next.js on port ${PORT:-3000}..."
exec npx next start
