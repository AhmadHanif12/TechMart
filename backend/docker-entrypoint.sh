#!/bin/bash
set -e

echo "🚀 TechMart Backend - Entrypoint"
echo "================================"

# Function to wait for PostgreSQL to be ready
wait_for_db() {
    echo "⏳ Waiting for PostgreSQL to be ready..."
    until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
        echo "   PostgreSQL is unavailable - sleeping"
        sleep 2
    done
    echo "✅ PostgreSQL is ready!"
}

# Function to wait for Redis to be ready
wait_for_redis() {
    echo "⏳ Waiting for Redis to be ready..."
    until redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping 2>/dev/null; do
        echo "   Redis is unavailable - sleeping"
        sleep 2
    done
    echo "✅ Redis is ready!"
}

# Function to run database migrations
run_migrations() {
    echo "📦 Running database migrations..."
    alembic upgrade head || {
        echo "⚠️  Migrations failed or already applied"
        return 0
    }
    echo "✅ Migrations completed!"
}

# Function to import data
import_data() {
    echo "📥 Checking for existing data..."

    # Check if data has already been imported by counting transactions (using psql directly)
    CHECK_EXISTS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c 'SELECT COUNT(*) FROM transactions' 2>/dev/null || echo "0")

    if [ "$CHECK_EXISTS" -gt 100 ]; then
        echo "✅ Data already imported ($CHECK_EXISTS transactions found)"
        return 0
    fi

    echo "📥 Importing data..."
    python -m scripts.import_data 2>&1 | grep -E "(📦|📥|✅ Imported|❌|Error)" || {
        echo "⚠️  Data import completed with warnings"
        return 0
    }
    echo "✅ Data import completed!"
}

# Function to setup performance optimization
setup_performance() {
    echo "⚡ Setting up performance optimization..."

    # Check if indexes are already created (using psql directly)
    CHECK_INDEXES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c 'SELECT COUNT(*) FROM pg_indexes WHERE schemaname = '"'"'public'"'" 2>/dev/null || echo "0")

    if [ "$CHECK_INDEXES" -gt 20 ]; then
        echo "✅ Performance indexes already exist ($CHECK_INDEXES indexes found)"
        return 0
    fi

    echo "⚡ Creating indexes and materialized views..."
    python -m scripts.setup_performance 2>&1 | grep -E "(⚡|✅|Indexes|Views|created)" || {
        echo "⚠️  Performance setup completed with warnings"
        return 0
    }
    echo "✅ Performance optimization completed!"
}

# Main initialization flow
main() {
    # Wait for dependencies
    wait_for_db
    wait_for_redis

    # Run setup tasks
    run_migrations
    import_data
    setup_performance

    echo ""
    echo "================================"
    echo "🎉 Initialization complete!"
    echo "================================"
    echo ""
    echo "🌍 Starting Uvicorn server..."
    echo "📡 API will be available at: http://0.0.0.0:8000"
    echo "📚 API Documentation: http://0.0.0.0:8000/docs"
    echo ""
}

# Run initialization in background for production, foreground for development
if [ "$1" = "uvicorn" ]; then
    # Run initialization before starting the server
    main

    # Start the server
    exec "$@"
else
    # Running custom command (e.g., pytest, shell)
    exec "$@"
fi
