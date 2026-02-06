#!/bin/sh
set -e

# Ensure DATABASE_URL is set (Prisma expects mysql://user:pass@host:port/db)
if [ -z "$DATABASE_URL" ] && [ -n "$MYSQL_URL" ]; then
  export DATABASE_URL="$MYSQL_URL"
fi

echo "Generating Prisma client..."
npx prisma generate

echo "Running migrations (if any)..."
npx prisma migrate deploy || true

echo "Starting server..."
node src/index.js
