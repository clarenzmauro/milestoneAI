#!/bin/bash

# Start PostgreSQL in Docker for development
echo "Starting PostgreSQL database for development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL container
docker run --name milestone-ai-postgres \
  -e POSTGRES_DB=milestone_ai_t3 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

echo "PostgreSQL container started on port 5432"
echo "Database: milestone_ai_t3"
echo "User: postgres"
echo "Password: password"
echo ""
echo "Waiting for database to be ready..."

# Wait for PostgreSQL to be ready
sleep 5

echo "Database is ready!"
echo ""
echo "You can now run:"
echo "  npm run db:push    - to create tables"
echo "  npm run db:studio  - to open Prisma Studio"
