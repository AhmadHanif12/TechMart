"""Inventory Prediction ORM model for demand forecasting (Challenge B)."""
from sqlalchemy import (
    Column, Integer, DECIMAL, Date, ForeignKey,
    UniqueConstraint, Index, DateTime
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class InventoryPrediction(Base):
    """Inventory prediction model for demand forecasting."""

    __tablename__ = "inventory_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    predicted_demand = Column(Integer, nullable=False)
    confidence_score = Column(DECIMAL(3, 2), nullable=True)
    prediction_date = Column(Date, nullable=False)
    prediction_horizon_days = Column(Integer, nullable=False)
    recommended_reorder_quantity = Column(Integer, nullable=True)
    optimal_supplier_id = Column(
        Integer,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True
    )
    seasonality_factor = Column(DECIMAL(4, 2), nullable=True)
    trend_factor = Column(DECIMAL(4, 2), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now()
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            'product_id', 'prediction_date', 'prediction_horizon_days',
            name='uq_prediction_per_product_date_horizon'
        ),
        Index('idx_inventory_predictions_product_date',
              'product_id', 'prediction_date'),
    )

    # Relationships
    product = relationship("Product", back_populates="inventory_predictions")

    def __repr__(self):
        return (f"<InventoryPrediction(id={self.id}, product_id={self.product_id}, "
                f"demand={self.predicted_demand}, confidence={self.confidence_score})>")
