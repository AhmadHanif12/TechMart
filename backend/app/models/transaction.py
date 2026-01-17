"""Transaction ORM model."""
from sqlalchemy import (
    Column, Integer, String, DECIMAL, Boolean, ForeignKey,
    DateTime, CheckConstraint, Index, TIMESTAMP, Text
)
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Transaction(Base):
    """Transaction model for customer purchases."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(
        Integer,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)
    total_amount = Column(DECIMAL(12, 2), nullable=False)
    status = Column(String(20), nullable=False, index=True)
    payment_method = Column(String(50), nullable=False)
    timestamp = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        index=True
    )
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(50), nullable=True)
    discount_applied = Column(DECIMAL(10, 2), default=0, nullable=False)
    tax_amount = Column(DECIMAL(10, 2), default=0, nullable=False)
    shipping_cost = Column(DECIMAL(10, 2), default=0, nullable=False)
    is_suspicious = Column(Boolean, default=False, nullable=False, index=True)
    fraud_score = Column(DECIMAL(3, 2), default=0, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now()
    )

    # Constraints
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_quantity_positive'),
        CheckConstraint(
            "total_amount >= 0.01",
            name='check_amount_positive'
        ),
        CheckConstraint(
            "status IN ('pending', 'completed', 'failed', 'refunded', 'flagged', 'cancelled')",
            name='check_valid_status'
        ),
        Index('idx_transactions_customer_timestamp', 'customer_id', 'timestamp'),
        Index('idx_transactions_timestamp_desc', 'timestamp'),
        Index('idx_transactions_suspicious', 'is_suspicious',
              postgresql_where=(Column('is_suspicious') == True)),
    )

    # Relationships
    customer = relationship("Customer", back_populates="transactions")
    product = relationship("Product", back_populates="transactions")

    def __repr__(self):
        return (f"<Transaction(id={self.id}, customer_id={self.customer_id}, "
                f"amount={self.total_amount}, status='{self.status}')>")

    @property
    def is_completed(self) -> bool:
        """Check if transaction is completed."""
        return self.status == 'completed'

    @property
    def is_high_risk(self) -> bool:
        """Check if transaction is high risk."""
        return self.is_suspicious or self.fraud_score > 0.7
