# ─── Stage 1: Development ─────────────────────────────
FROM node:20-alpine AS development

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install

COPY . .

# ─── Stage 2: Builder ─────────────────────────────────
FROM development AS builder

RUN pnpm run build

# ─── Stage 3: Production ──────────────────────────────
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
