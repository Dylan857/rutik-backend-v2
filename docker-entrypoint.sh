#!/bin/sh
set -e

echo "Running database migrations..."
pnpm run migration:run:prod

echo "Starting application..."
exec node dist/main
