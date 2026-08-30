# syntax=docker/dockerfile:1

# --- build stage: instala tudo (inclui devDependencies) e compila ---
FROM node:22-slim AS build
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# `npm run build` roda `prisma generate && next build`
RUN npm run build

# --- runner stage: mesma base Debian (engines do Prisma batem) ---
FROM node:22-slim AS runner
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=build /app ./

EXPOSE 3000

# aplica as migrations pendentes e sobe o Next
CMD ["npm", "run", "start:migrate"]
