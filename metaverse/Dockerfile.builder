FROM node:20-bookworm-slim AS base_builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY . .
RUN npm install

WORKDIR /app/packages/db
RUN npx prisma generate
