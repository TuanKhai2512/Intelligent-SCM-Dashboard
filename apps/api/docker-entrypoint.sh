#!/bin/sh
set -e
./node_modules/.bin/prisma migrate deploy
if [ "$SEED_ON_START" = "true" ]; then
  node dist/seed/main.js
fi
exec node dist/main.js
