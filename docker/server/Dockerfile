FROM node:22-alpine

WORKDIR /app

RUN corepack enable

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY types ./types
COPY server ./server

# Install dependencies
RUN pnpm install --filter @nextask/server...

# Build
WORKDIR /app/server

RUN pnpm prisma generate
RUN pnpm build

EXPOSE 3000

CMD ["node","dist/index.js"]