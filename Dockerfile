# =============================================================================
# Stage 1 – deps: install all npm dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# =============================================================================
# Stage 2 – builder: generate Prisma client + build Next.js
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma 7 client into app/generated/prisma
# (no DB connection required for this step)
RUN npx prisma generate

# Next.js "collects page data" at build time, which imports lib/prisma.ts
# and checks for DATABASE_URL at module-init.  We pass a dummy value so the
# module can initialise without throwing; no real DB connection is made.
ARG DATABASE_URL=postgresql://postgres:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=$DATABASE_URL

# Build the Next.js application
RUN npm run build

# =============================================================================
# Stage 3 – runner: lean production image
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Tell Next.js to listen on all interfaces so Docker port-mapping works
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Application code + build artefacts
COPY --from=builder --chown=nextjs:nodejs /app/.next          ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules   ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json   ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

# Prisma files needed for `prisma db push` at container start
COPY --from=builder --chown=nextjs:nodejs /app/prisma         ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/app/generated  ./app/generated

# Startup script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
