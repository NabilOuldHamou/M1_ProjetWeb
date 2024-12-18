#!/bin/sh
set -xe

pnpm install
pnpm prisma generate

pnpm run build

pnpx prisma db push

ls

node build