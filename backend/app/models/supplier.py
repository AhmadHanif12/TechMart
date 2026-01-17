"""Supplier ORM model."""
from sqlalchemy import Column, Integer, String, Date, DECIMAL, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Supplier(Base):
    """Supplier model for product suppliers."""

    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    country = Column(String(100), nullable=True)
    reliability_score = Column(DECIMAL(3, 2), nullable=True)
    average_delivery_days = Column(Integer, nullable=True)
    payment_terms = Column(String(50), nullable=True)
    established_date = Column(Date, nullable=True)
    certification = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now()
    )

    # Relationships
    products = relationship("Product", back_populates="supplier")
    reorder_suggestions = relationship("ReorderSuggestion", back_populates="supplier")

    def __repr__(self):
        return f"<Supplier(id={self.id}, name='{self.name}', reliability={self.reliability_score})>"
