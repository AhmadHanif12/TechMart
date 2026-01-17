"""Customer Purchase Pattern ORM model for analytics."""
from sqlalchemy import (
    Column, Integer, DECIMAL, ForeignKey, DateTime, ARRAY, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB, INTERVAL
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class CustomerPurchasePattern(Base):
    """Customer purchase pattern model for behavior analytics."""

    __tablename__ = "customer_purchase_patterns"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(
        Integer,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    average_transaction_amount = Column(DECIMAL(10, 2), nullable=True)
    median_transaction_amount = Column(DECIMAL(10, 2), nullable=True)
    std_dev_amount = Column(DECIMAL(10, 2), nullable=True)
    total_transactions = Column(Integer, default=0, nullable=False)
    last_purchase_date = Column(DateTime(timezone=True), nullable=True)
    avg_time_between_purchases = Column(INTERVAL, nullable=True)
    favorite_categories = Column(JSONB, nullable=True)
    typical_purchase_hours = Column(ARRAY(Integer), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint('customer_id', name='uq_pattern_per_customer'),
    )

    # Relationships
    customer = relationship("Customer", back_populates="purchase_pattern")

    def __repr__(self):
        return (f"<CustomerPurchasePattern(customer_id={self.customer_id}, "
                f"avg_amount={self.average_transaction_amount}, "
                f"total_txns={self.total_transactions})>")
