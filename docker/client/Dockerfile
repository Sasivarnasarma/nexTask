FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json pnpm-workspace.yaml ./
COPY types ./types
COPY client ./client

RUN pnpm install --filter @nextask/client...

WORKDIR /app/client

RUN pnpm build

FROM nginx:alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]