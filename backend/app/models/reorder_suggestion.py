"""Reorder Suggestion ORM model for automated inventory management (Challenge B)."""
from sqlalchemy import (
    Column, Integer, DECIMAL, Date, ForeignKey, Text,
    String, CheckConstraint, DateTime
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ReorderSuggestion(Base):
    """Reorder suggestion model for automated inventory replenishment."""

    __tablename__ = "reorder_suggestions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    suggested_quantity = Column(Integer, nullable=False)
    suggested_supplier_id = Column(
        Integer,
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False
    )
    urgency_score = Column(DECIMAL(3, 2), nullable=True)
    estimated_stockout_date = Column(Date, nullable=True)
    reasoning = Column(Text, nullable=True)
    status = Column(String(20), default='pending', nullable=False)
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
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'ordered')",
            name='check_valid_status'
        ),
    )

    # Relationships
    product = relationship("Product", back_populates="reorder_suggestions")
    supplier = relationship("Supplier", back_populates="reorder_suggestions")

    def __repr__(self):
        return (f"<ReorderSuggestion(id={self.id}, product_id={self.product_id}, "
                f"quantity={self.suggested_quantity}, status='{self.status}')>")
