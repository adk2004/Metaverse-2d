# ------------- Stage 1: Base Builder --------------
FROM node:20-bookworm-slim AS base_builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates
COPY . .
RUN npm install
WORKDIR /app/packages/db
RUN npx prisma generate

# ---------- Stage 2: Service Builder ----------
FROM base_builder AS builder

WORKDIR /app/apps/ws
RUN npm run build

# ---------- Stage 3: Runtime ----------
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/apps/ws/dist ./dist
COPY --from=builder /app/apps/ws/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/index.js"]