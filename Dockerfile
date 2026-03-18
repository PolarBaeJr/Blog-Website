# =============================================================================
# Multi-stage Dockerfile for Next.js Blog
# Optimized for ARM64 (Raspberry Pi 4/5) deployment
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install production dependencies only
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# Stage 2: Build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js (output: 'standalone' configured in next.config.mjs)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production runner (minimal image)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets from builder
COPY --from=builder /app/public ./public

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migrations for runtime migrate deploy
COPY --from=builder /app/prisma ./prisma

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

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
