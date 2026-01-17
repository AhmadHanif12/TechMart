"""Celery tasks for inventory management (Challenge B)."""
import asyncio
from datetime import datetime, date
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.tasks.celery_app import celery_app
from app.config import get_settings
from app.models.product import Product
from app.models.reorder_suggestion import ReorderSuggestion
from app.models.alert import Alert
from app.services.inventory_service import InventoryService

settings = get_settings()


def get_async_session():
    """Create async database session for Celery tasks."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session()


@celery_app.task(name="app.tasks.inventory_tasks.refresh_predictions")
def refresh_predictions():
    """
    Refresh demand predictions for all products.

    Runs every 6 hours to update demand forecasts.
    """
    # This would store predictions in inventory_predictions table
    # For now, predictions are calculated on-demand
    return {"status": "predictions_refreshed"}


@celery_app.task(name="app.tasks.inventory_tasks.generate_reorder_suggestions")
def generate_reorder_suggestions():
    """
    Generate reorder suggestions for low stock products.

    Runs every 12 hours or can be triggered manually.
    """
    return asyncio.run(_generate_reorder_suggestions())


async def _generate_reorder_suggestions():
    """Async implementation of reorder suggestion generation."""
    session = get_async_session()

    try:
        inventory_service = InventoryService(session)

        # Get all products below reorder threshold
        result = await session.execute(
            select(Product).where(
                Product.stock_quantity <= Product.reorder_threshold
            )
        )
        low_stock_products = result.scalars().all()

        suggestions_created = 0

        for product in low_stock_products:
            # Check if suggestion already exists for this product
            existing = await session.execute(
                select(ReorderSuggestion).where(
                    and_(
                        ReorderSuggestion.product_id == product.id,
                        ReorderSuggestion.status == 'pending'
                    )
                )
            )

            if existing.scalar_one_or_none():
                continue  # Skip if pending suggestion already exists

            # Generate suggestion using inventory service
            suggestion_data = await inventory_service.generate_reorder_suggestion(product.id)

            if suggestion_data:
                # Create reorder suggestion
                suggestion = ReorderSuggestion(
                    product_id=suggestion_data['product_id'],
                    suggested_quantity=suggestion_data['suggested_quantity'],
                    suggested_supplier_id=suggestion_data['suggested_supplier_id'],
                    urgency_score=suggestion_data['urgency_score'],
                    estimated_stockout_date=suggestion_data['estimated_stockout_date'],
                    reasoning=suggestion_data['reasoning'],
                    status='pending'
                )
                session.add(suggestion)
                suggestions_created += 1

        await session.commit()

        return {
            "status": "completed",
            "suggestions_created": suggestions_created,
            "products_checked": len(low_stock_products)
        }

    except Exception as e:
        await session.rollback()
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        await session.close()


@celery_app.task(name="app.tasks.inventory_tasks.check_stock_levels")
def check_stock_levels():
    """
    Check stock levels and create alerts for critical items.

    Runs every hour.
    """
    return asyncio.run(_check_stock_levels())


async def _check_stock_levels():
    """Async implementation of stock level checking."""
    session = get_async_session()

    try:
        # Get products with critical stock levels (0 stock or below 20% of threshold)
        result = await session.execute(
            select(Product).where(
                Product.stock_quantity <= (Product.reorder_threshold * 0.2)
            )
        )
        critical_products = result.scalars().all()

        alerts_created = 0

        for product in critical_products:
            # Calculate urgency
            stock_percentage = (product.stock_quantity / product.reorder_threshold * 100) if product.reorder_threshold > 0 else 0

            if product.stock_quantity == 0:
                severity = 'critical'
                title = f"Out of Stock: {product.name}"
                message = f"Product {product.name} (SKU: {product.sku}) is completely out of stock. Immediate reorder required."
            elif stock_percentage <= 10:
                severity = 'high'
                title = f"Critical Stock Level: {product.name}"
                message = f"Product {product.name} (SKU: {product.sku}) has only {product.stock_quantity} units remaining. Urgent reorder needed."
            else:
                severity = 'medium'
                title = f"Low Stock Warning: {product.name}"
                message = f"Product {product.name} (SKU: {product.sku}) is running low with {product.stock_quantity} units. Consider reordering soon."

            # Check if similar unresolved alert already exists (within last 24 hours)
            from datetime import timedelta
            recent_cutoff = datetime.utcnow() - timedelta(hours=24)

            existing_alert = await session.execute(
                select(Alert).where(
                    and_(
                        Alert.entity_type == 'product',
                        Alert.entity_id == product.id,
                        Alert.alert_type == 'low_stock',
                        Alert.is_resolved == False,
                        Alert.created_at >= recent_cutoff
                    )
                )
            )

            if existing_alert.scalar_one_or_none():
                continue  # Skip if recent unresolved alert exists

            # Create alert
            alert = Alert(
                alert_type='low_stock',
                severity=severity,
                title=title,
                message=message,
                entity_type='product',
                entity_id=product.id,
                is_resolved=False
            )
            session.add(alert)
            alerts_created += 1

        await session.commit()

        return {
            "status": "completed",
            "alerts_created": alerts_created,
            "critical_products": len(critical_products)
        }

    except Exception as e:
        await session.rollback()
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        await session.close()
