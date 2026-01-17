"""Alert ORM model."""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, CheckConstraint,
    DateTime, Index
)
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base


class Alert(Base):
    """Alert model for system notifications."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        index=True
    )
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "severity IN ('low', 'medium', 'high', 'critical')",
            name='check_valid_severity'
        ),
        Index('idx_alerts_unresolved', 'created_at',
              postgresql_where=(Column('is_resolved') == False)),
        Index('idx_alerts_type_severity', 'alert_type', 'severity'),
    )

    def __repr__(self):
        return (f"<Alert(id={self.id}, type='{self.alert_type}', "
                f"severity='{self.severity}', resolved={self.is_resolved})>")
