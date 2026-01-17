"""Customer ORM model."""
from sqlalchemy import Column, Integer, String, Date, DECIMAL, Text, CheckConstraint, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Customer(Base):
    """Customer model for user accounts."""

    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    registration_date = Column(Date, nullable=False)
    total_spent = Column(DECIMAL(12, 2), default=0, nullable=False)
    risk_score = Column(DECIMAL(3, 2), default=0, nullable=False)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    preferred_payment = Column(String(50), nullable=True)
    loyalty_tier = Column(String(20), nullable=True, index=True)
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
        CheckConstraint('risk_score >= 0 AND risk_score <= 1',
                        name='check_risk_score_range'),
    )

    # Relationships
    transactions = relationship("Transaction", back_populates="customer")
    purchase_pattern = relationship(
        "CustomerPurchasePattern",
        back_populates="customer",
        uselist=False
    )

    def __repr__(self):
        return f"<Customer(id={self.id}, email='{self.email}', tier='{self.loyalty_tier}')>"

    @property
    def full_name(self) -> str:
        """Get customer's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email
