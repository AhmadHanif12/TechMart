"""Import data from CSV/JSON files into PostgreSQL database."""
import asyncio
import json
import pandas as pd
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

# Add parent directory to path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal, init_db
from app.models import (
    Supplier, Product, Customer, Transaction
)


async def import_suppliers(session: AsyncSession, data_dir: Path):
    """Import suppliers from JSON file."""
    print("📦 Importing suppliers...")

    file_path = data_dir / "suppliers.json"
    with open(file_path, 'r') as f:
        suppliers_data = json.load(f)

    count = 0
    for item in suppliers_data:
        # Convert established_date string to date object
        if item.get('established_date'):
            item['established_date'] = datetime.strptime(
                item['established_date'], '%Y-%m-%d'
            ).date()

        supplier = Supplier(**item)
        session.add(supplier)
        count += 1

        if count % 100 == 0:
            await session.flush()
            print(f"   Imported {count} suppliers...")

    await session.commit()
    print(f"✅ Imported {count} suppliers successfully!\n")


async def import_customers(session: AsyncSession, data_dir: Path):
    """Import customers from JSON file."""
    print("👥 Importing customers...")

    file_path = data_dir / "customers.json"
    with open(file_path, 'r') as f:
        customers_data = json.load(f)

    count = 0
    for item in customers_data:
        # Convert date strings to date objects
        if item.get('registration_date'):
            item['registration_date'] = datetime.strptime(
                item['registration_date'], '%Y-%m-%d'
            ).date()

        if item.get('date_of_birth'):
            item['date_of_birth'] = datetime.strptime(
                item['date_of_birth'], '%Y-%m-%d'
            ).date()

        customer = Customer(**item)
        session.add(customer)
        count += 1

        if count % 500 == 0:
            await session.flush()
            print(f"   Imported {count} customers...")

    await session.commit()
    print(f"✅ Imported {count} customers successfully!\n")


async def import_products(session: AsyncSession, data_dir: Path):
    """Import products from JSON file."""
    print("📱 Importing products...")

    file_path = data_dir / "products.json"
    with open(file_path, 'r') as f:
        products_data = json.load(f)

    count = 0
    for item in products_data:
        # Convert created_at if it exists - handle various formats
        if item.get('created_at'):
            timestamp_str = item['created_at']
            try:
                # Try ISO format first (with T separator)
                if 'T' in timestamp_str:
                    item['created_at'] = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                # Try space-separated format
                elif ' ' in timestamp_str:
                    item['created_at'] = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                # Try date-only format
                else:
                    item['created_at'] = datetime.strptime(timestamp_str, '%Y-%m-%d')
            except Exception as e:
                print(f"Warning: Could not parse timestamp {timestamp_str}, using now")
                item['created_at'] = datetime.utcnow()

        # Set default values for new fields
        item.setdefault('reorder_threshold', 10)
        item.setdefault('reorder_quantity', 50)

        product = Product(**item)
        session.add(product)
        count += 1

        if count % 500 == 0:
            await session.flush()
            print(f"   Imported {count} products...")

    await session.commit()
    print(f"✅ Imported {count} products successfully!\n")


async def import_transactions(session: AsyncSession, data_dir: Path):
    """Import transactions from JSON file."""
    print("💳 Importing transactions...")

    file_path = data_dir / "transactions.json"
    with open(file_path, 'r') as f:
        transactions_data = json.load(f)

    count = 0
    skipped = 0
    batch_size = 1000

    for item in transactions_data:
        # Validate data before inserting
        # Check for negative amounts
        if item.get('total_amount', 0) <= 0.01:
            skipped += 1
            continue

        # Convert timestamp string to datetime - handle various formats
        if item.get('timestamp'):
            timestamp_str = item['timestamp']
            try:
                # Try ISO format first (with T separator)
                if 'T' in timestamp_str:
                    item['timestamp'] = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                # Try space-separated format
                elif ' ' in timestamp_str:
                    item['timestamp'] = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                # Try date-only format
                else:
                    item['timestamp'] = datetime.strptime(timestamp_str, '%Y-%m-%d')
            except Exception as e:
                print(f"Warning: Could not parse timestamp {timestamp_str}, using now")
                item['timestamp'] = datetime.utcnow()

        # Set defaults for new fields
        item.setdefault('is_suspicious', False)
        item.setdefault('fraud_score', 0.0)

        # Add to database
        transaction = Transaction(**item)
        session.add(transaction)
        count += 1

        # Commit in batches for better performance
        if count % batch_size == 0:
            await session.commit()
            print(f"   Imported {count} transactions (skipped {skipped} invalid)...")

    await session.commit()
    print(f"✅ Imported {count} transactions successfully (skipped {skipped} invalid entries)!\n")


async def verify_import(session: AsyncSession):
    """Verify imported data counts."""
    print("\n📊 Verifying imported data...")

    # Count records
    supplier_count = await session.scalar(select(func.count()).select_from(Supplier))
    product_count = await session.scalar(select(func.count()).select_from(Product))
    customer_count = await session.scalar(select(func.count()).select_from(Customer))
    transaction_count = await session.scalar(select(func.count()).select_from(Transaction))

    print(f"   Suppliers: {supplier_count}")
    print(f"   Products: {product_count}")
    print(f"   Customers: {customer_count}")
    print(f"   Transactions: {transaction_count}")
    print()


async def main():
    """Main import function."""
    print("=" * 60)
    print("TechMart Data Import Script")
    print("=" * 60)
    print()

    # Determine data directory
    # Inside container, use /app/Material; locally use the project path
    import os
    if os.path.exists("/app/Material"):
        data_dir = Path("/app/Material/techmart_data/techmart_data")
    else:
        data_dir = Path(__file__).parent.parent.parent / "Material" / "techmart_data" / "techmart_data"

    if not data_dir.exists():
        print(f"❌ Error: Data directory not found at {data_dir}")
        return

    print(f"📂 Data directory: {data_dir}\n")

    # Initialize database
    print("🔧 Initializing database...")
    await init_db()
    print("✅ Database initialized\n")

    # Import data
    async with AsyncSessionLocal() as session:
        try:
            # Import in order of dependencies
            await import_suppliers(session, data_dir)
            await import_customers(session, data_dir)
            await import_products(session, data_dir)
            await import_transactions(session, data_dir)

            # Verify import
            await verify_import(session)

            print("=" * 60)
            print("✅ Data import completed successfully!")
            print("=" * 60)

        except Exception as e:
            print(f"\n❌ Error during import: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    # Import func for count
    from sqlalchemy import func

    asyncio.run(main())
