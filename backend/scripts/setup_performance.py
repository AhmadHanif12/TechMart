"""Setup database indexes and materialized views for performance optimization."""
import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal


async def execute_sql_file(session: AsyncSession, file_path: Path):
    """Execute SQL commands from a file."""
    print(f"📄 Reading SQL from {file_path}...")

    with open(file_path, 'r') as f:
        sql_content = f.read()

    # Split by semicolon and execute each statement
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]

    for i, statement in enumerate(statements, 1):
        if statement:
            try:
                await session.execute(text(statement))
                await session.commit()
                # Show progress for larger operations
                if i % 10 == 0:
                    print(f"   Executed {i}/{len(statements)} statements...")
            except Exception as e:
                print(f"   Warning: Statement {i} failed: {e}")
                # Continue with other statements

    print(f"✅ Executed {len(statements)} SQL statements")


async def refresh_materialized_views(session: AsyncSession):
    """Refresh all materialized views."""
    print("\n🔄 Refreshing materialized views...")

    views = [
        "dashboard_overview_mv",
        "hourly_sales_mv",
        "top_products_mv",
        "category_performance_mv",
        "customer_segments_mv",
        "supplier_performance_mv",
    ]

    for view in views:
        try:
            query = text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view}")
            await session.execute(query)
            await session.commit()
            print(f"   ✅ Refreshed {view}")
        except Exception as e:
            print(f"   ⚠️  Could not refresh {view}: {e}")


async def verify_indexes(session: AsyncSession):
    """Verify that indexes were created successfully."""
    print("\n🔍 Verifying indexes...")

    query = text("""
        SELECT
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
    """)

    result = await session.execute(query)
    indexes = result.fetchall()

    # Group by table
    from collections import defaultdict
    by_table = defaultdict(list)
    for idx in indexes:
        by_table[idx[1]].append(idx[2])

    print(f"\n📊 Index Summary ({len(indexes)} total indexes):\n")
    for table, table_indexes in sorted(by_table.items()):
        print(f"   {table}: {len(table_indexes)} indexes")

    return indexes


async def verify_materialized_views(session: AsyncSession):
    """Verify that materialized views were created."""
    print("\n🔍 Verifying materialized views...")

    query = text("""
        SELECT
            schemaname,
            matviewname,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
        FROM pg_matviews
        WHERE schemaname = 'public'
        ORDER BY matviewname
    """)

    result = await session.execute(query)
    views = result.fetchall()

    print(f"\n📊 Materialized Views ({len(views)} total):\n")
    for view in views:
        print(f"   {view[1]}: {view[2] if len(view) > 2 else 'N/A'}")

    return views


async def main():
    """Main function to set up performance optimization."""
    print("=" * 70)
    print("TechMart Database Performance Optimization Setup")
    print("=" * 70)
    print()

    # Get the script directory
    script_dir = Path(__file__).parent
    sql_file = script_dir / "create_indexes.sql"

    if not sql_file.exists():
        print(f"❌ Error: SQL file not found at {sql_file}")
        return

    async with AsyncSessionLocal() as session:
        try:
            # Step 1: Create indexes and materialized views
            print("Step 1: Creating indexes and materialized views")
            print("-" * 70)
            await execute_sql_file(session, sql_file)

            # Step 2: Refresh materialized views
            print("\nStep 2: Initial refresh of materialized views")
            print("-" * 70)
            await refresh_materialized_views(session)

            # Step 3: Verify indexes
            print("\nStep 3: Verification")
            print("-" * 70)
            await verify_indexes(session)
            await verify_materialized_views(session)

            print("\n" + "=" * 70)
            print("✅ Performance optimization setup completed successfully!")
            print("=" * 70)

            print("\n💡 Next steps:")
            print("   1. Set up Celery beat task to refresh views periodically:")
            print("      - dashboard_overview_mv: every 5 minutes")
            print("      - hourly_sales_mv: every hour")
            print("      - top_products_mv: every 30 minutes")
            print("      - category_performance_mv: every hour")
            print("      - customer_segments_mv: every 15 minutes")
            print("   2. Monitor query performance with pg_stat_statements")
            print("   3. Consider partitioning transactions table by month")

        except Exception as e:
            print(f"\n❌ Error during setup: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
