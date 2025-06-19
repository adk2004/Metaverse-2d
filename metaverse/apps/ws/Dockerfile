# ---------- Stage 1: Builder ----------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY . .
RUN npm install

WORKDIR /app/packages/db
RUN npx prisma generate

WORKDIR /app/apps/ws
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/apps/ws/dist ./dist
COPY --from=builder /app/apps/ws/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/index.js"]