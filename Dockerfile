# Build stage
FROM node:18.18-alpine

WORKDIR /app

COPY . .

RUN npm i -g pnpm

EXPOSE 3000

RUN chmod +x /app/docker_entrypoint.sh
ENTRYPOINT ["/app/docker_entrypoint.sh"]