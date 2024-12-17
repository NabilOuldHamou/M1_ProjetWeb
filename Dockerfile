# Build stage
FROM node:18.18-alpine

RUN npm i -g pnpm

EXPOSE 3000
ENV NODE_ENV=production

COPY . /app

WORKDIR /app

CMD docker_entrypoint.sh