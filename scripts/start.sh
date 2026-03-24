#!/bin/sh
# =============================================================================
# Docker container startup script
# Runs database migrations, seeds data, then starts the Next.js server
# =============================================================================

set -e

echo "==> Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "==> Seeding database (if seed script exists)..."
node node_modules/prisma/build/index.js db seed || true

echo "==> Starting Next.js server on port ${PORT:-3000}..."
node server.js
