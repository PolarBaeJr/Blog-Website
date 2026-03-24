# =============================================================================
# Multi-stage Dockerfile for Next.js Blog
# Optimized for ARM64 (Raspberry Pi 4/5) deployment
# Uses Debian slim (glibc) for better Prisma ARM64 compatibility
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js (output: 'standalone' configured in next.config.mjs)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Production runner (minimal image)
# ---------------------------------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs --ingroup nodejs

# Copy public assets from builder
COPY --from=builder /app/public ./public

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migrations for runtime migrate deploy
COPY --from=builder /app/prisma ./prisma

# Copy generated Prisma client and CLI
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy the startup script
COPY scripts/start.sh ./start.sh
RUN chmod +x start.sh

# Create uploads directory with correct ownership
RUN mkdir -p public/uploads && chown -R nextjs:nodejs public/uploads

# Set ownership of the app directory for the non-root user
RUN chown -R nextjs:nodejs /app/.next

# Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["./start.sh"]
