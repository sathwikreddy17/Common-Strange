# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Provide safe defaults so `next build` can compile pages that reference
# NEXT_PUBLIC_* variables. Real values are injected at runtime.
ENV NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_BACKEND_BASE=http://backend:8000
ENV NEXT_PUBLIC_API_BASE=http://backend:8000

RUN npm run build

# ---- Production ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what we need to run
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "server.js"]
