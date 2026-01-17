"""Product ORM model."""
from sqlalchemy import (
    Column, Integer, String, DECIMAL, Text, ForeignKey,
    CheckConstraint, Index, DateTime
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Product(Base):
    """Product model for inventory items."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    price = Column(DECIMAL(10, 2), nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    supplier_id = Column(
        Integer,
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    sku = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    weight = Column(DECIMAL(8, 3), nullable=True)
    dimensions = Column(String(100), nullable=True)
    warranty_months = Column(Integer, nullable=True)
    reorder_threshold = Column(Integer, default=10, nullable=False)
    reorder_quantity = Column(Integer, default=50, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Constraints
    __table_args__ = (
        CheckConstraint('price >= 0', name='check_price_positive'),
        CheckConstraint('stock_quantity >= 0', name='check_stock_non_negative'),
        Index('idx_products_stock_low', 'stock_quantity',
              postgresql_where=(Column('stock_quantity') < 20)),
    )

    # Relationships
    supplier = relationship("Supplier", back_populates="products")
    transactions = relationship("Transaction", back_populates="product")
    inventory_predictions = relationship("InventoryPrediction", back_populates="product")
    reorder_suggestions = relationship("ReorderSuggestion", back_populates="product")

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', stock={self.stock_quantity})>"

    @property
    def is_low_stock(self) -> bool:
        """Check if product is below reorder threshold."""
        return self.stock_quantity < self.reorder_threshold
