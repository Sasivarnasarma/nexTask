FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy root monorepo config
COPY package.json pnpm-workspace.yaml ./

# Copy shared types and server
COPY types ./types
COPY server ./server

# Install dependencies for server workspace
RUN pnpm install --filter=@nextask/server...

# Build server
WORKDIR /app/server
RUN pnpm prisma:generate
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY types ./types
COPY server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma

# Install production dependencies only
RUN pnpm install --filter=@nextask/server... --prod

WORKDIR /app/server
RUN pnpm prisma:generate

CMD ["pnpm", "start"]
