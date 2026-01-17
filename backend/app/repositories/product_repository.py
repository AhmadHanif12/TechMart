"""Product repository with inventory-specific queries."""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.repositories.base import BaseRepository
from app.websocket import manager


class ProductRepository(BaseRepository[Product]):
    """Repository for Product model."""

    def __init__(self, db: AsyncSession):
        super().__init__(Product, db)

    async def get_by_sku(self, sku: str) -> Optional[Product]:
        """
        Get product by SKU.

        Args:
            sku: Product SKU

        Returns:
            Product instance or None
        """
        result = await self.db.execute(
            select(Product).where(Product.sku == sku)
        )
        return result.scalar_one_or_none()

    async def get_with_supplier(self, product_id: int) -> Optional[Product]:
        """
        Get product with supplier relationship loaded.

        Args:
            product_id: Product ID

        Returns:
            Product with supplier or None
        """
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.supplier))
            .where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_low_stock_products(
        self,
        threshold: Optional[int] = None
    ) -> List[Product]:
        """
        Get products below reorder threshold.

        Args:
            threshold: Optional custom threshold (uses product's reorder_threshold if None)

        Returns:
            List of low stock products
        """
        if threshold:
            query = select(Product).where(Product.stock_quantity < threshold)
        else:
            query = select(Product).where(
                Product.stock_quantity < Product.reorder_threshold
            )

        query = query.options(selectinload(Product.supplier))
        query = query.order_by(Product.stock_quantity.asc())

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_category(
        self,
        category: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Get products by category.

        Args:
            category: Product category
            skip: Pagination offset
            limit: Max results

        Returns:
            List of products in category
        """
        result = await self.db.execute(
            select(Product)
            .where(Product.category == category)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_supplier(
        self,
        supplier_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Get products by supplier.

        Args:
            supplier_id: Supplier ID
            skip: Pagination offset
            limit: Max results

        Returns:
            List of products from supplier
        """
        result = await self.db.execute(
            select(Product)
            .where(Product.supplier_id == supplier_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def search_products(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Search products by name or description.

        Args:
            search_term: Search term
            skip: Pagination offset
            limit: Max results

        Returns:
            List of matching products
        """
        search_pattern = f"%{search_term}%"
        result = await self.db.execute(
            select(Product)
            .where(
                or_(
                    Product.name.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                    Product.sku.ilike(search_pattern)
                )
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update_stock(self, product_id: int, quantity_change: int) -> Optional[Product]:
        """
        Update product stock quantity.

        Args:
            product_id: Product ID
            quantity_change: Amount to add/subtract (negative to subtract)

        Returns:
            Updated product or None
        """
        product = await self.get_by_id(product_id)
        if not product:
            return None

        new_stock = product.stock_quantity + quantity_change
        if new_stock < 0:
            raise ValueError(f"Insufficient stock. Available: {product.stock_quantity}, Requested: {abs(quantity_change)}")

        product.stock_quantity = new_stock
        await self.db.flush()
        await self.db.refresh(product)

        # Broadcast stock update via WebSocket
        from app.websocket import broadcast_stock_update
        product_data = {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "old_stock": new_stock - quantity_change,
            "new_stock": new_stock,
            "quantity_change": quantity_change,
            "timestamp": datetime.utcnow().isoformat()
        }
        await broadcast_stock_update(product_data)

        return product

    async def get_out_of_stock(self) -> List[Product]:
        """
        Get products that are out of stock.

        Returns:
            List of out of stock products
        """
        result = await self.db.execute(
            select(Product)
            .where(Product.stock_quantity == 0)
            .options(selectinload(Product.supplier))
        )
        return result.scalars().all()

    async def get_total_products_count(self) -> int:
        """
        Get total product count all time.

        Returns:
            Total product count
        """
        result = await self.db.execute(
            select(func.count(Product.id))
        )
        return result.scalar_one()
