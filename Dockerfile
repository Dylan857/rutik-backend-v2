# ─── Stage 1: Development ─────────────────────────────
FROM node:20-alpine AS development

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .

# ─── Stage 2: Builder ─────────────────────────────────
FROM development AS builder

RUN pnpm run build

# ─── Stage 3: Production ──────────────────────────────
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm && apk add --no-cache tini

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
  && addgroup -S nodejs && adduser -S nestjs -G nodejs \
  && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/'+ (process.env.API_PREFIX||'api') +'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./docker-entrypoint.sh"]
