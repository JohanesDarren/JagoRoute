# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Backend target for the /api/* server-side rewrites, and the public API URL
# inlined into the client bundle. Both are baked at build time (Next.js
# inlines them), so they must come from build args, not runtime env.
ARG BACKEND_URL
ARG NEXT_PUBLIC_API_URL
# NEXT_PUBLIC_API_URL must include /api/v1 (api.ts appends paths to it).
# Use relative "/api/v1" to proxy through Next.js, or an absolute backend URL
# like http://localhost:8000/api/v1 for direct browser→backend calls.
ENV BACKEND_URL=${BACKEND_URL:-http://localhost:8000}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api/v1}
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]