#!/bin/sh
# =============================================================================
# Docker container startup script
# Runs database migrations, seeds data, then starts the Next.js server
# =============================================================================

set -e

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Seeding database (if seed script exists)..."
npx prisma db seed || true

echo "==> Starting Next.js server on port ${PORT:-3000}..."
node server.js
