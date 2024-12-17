#!/bin/sh
set -xe

pnpm install
pnpm prisma generate

pnpm run build
pnpm prune --prod

pnpx prisma db push

node build/index.js