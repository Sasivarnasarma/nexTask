FROM node:22-alpine

WORKDIR /app

RUN corepack enable

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json pnpm-workspace.yaml ./
COPY types ./types
COPY server ./server

RUN pnpm install --filter @nextask/server...

WORKDIR /app/server

RUN pnpm prisma generate
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/index.js"]