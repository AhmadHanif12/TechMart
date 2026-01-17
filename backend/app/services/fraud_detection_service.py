"""Fraud detection service for analyzing suspicious transactions."""
from typing import Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transaction_repository import TransactionRepository
from app.repositories.customer_repository import CustomerRepository


class FraudDetectionService:
    """Service for detecting fraudulent transactions."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.transaction_repo = TransactionRepository(db)
        self.customer_repo = CustomerRepository(db)

    async def analyze_transaction(
        self,
        customer_id: int,
        amount: float,
        ip_address: str = None
    ) -> Tuple[bool, float, str]:
        """
        Analyze transaction for fraud indicators.

        Args:
            customer_id: Customer ID
            amount: Transaction amount
            ip_address: Customer IP address

        Returns:
            Tuple of (is_suspicious, fraud_score, reason)
        """
        fraud_score = 0.0
        reasons = []

        # Check 1: Velocity Check - Too many transactions in short time
        recent_count = await self.transaction_repo.get_customer_transaction_count(
            customer_id=customer_id,
            minutes=10
        )

        if recent_count >= 5:
            fraud_score += 0.4
            reasons.append(f"High velocity: {recent_count} transactions in 10 minutes")

        # Check 2: Amount Check - Unusually large amount
        if amount > 5000:
            fraud_score += 0.3
            reasons.append(f"Large amount: ${amount}")

        # Check 3: Customer Risk Score
        customer = await self.customer_repo.get_by_id(customer_id)
        if customer and customer.risk_score > 0.5:
            fraud_score += customer.risk_score * 0.3
            reasons.append(f"High customer risk score: {customer.risk_score}")

        # Check 4: Time-based Check - Unusual hours
        current_hour = datetime.utcnow().hour
        if current_hour >= 2 and current_hour <= 5:  # 2 AM - 5 AM
            fraud_score += 0.2
            reasons.append("Unusual hour: Late night transaction")

        # Cap fraud score at 1.0
        fraud_score = min(fraud_score, 1.0)

        # Determine if suspicious (threshold: 0.6)
        is_suspicious = fraud_score >= 0.6

        reason_text = "; ".join(reasons) if reasons else "No fraud indicators"

        return is_suspicious, round(fraud_score, 2), reason_text

    async def check_velocity(
        self,
        customer_id: int,
        time_window_minutes: int = 10,
        threshold: int = 5
    ) -> bool:
        """
        Check if customer has exceeded velocity threshold.

        Args:
            customer_id: Customer ID
            time_window_minutes: Time window in minutes
            threshold: Maximum allowed transactions

        Returns:
            True if threshold exceeded
        """
        count = await self.transaction_repo.get_customer_transaction_count(
            customer_id=customer_id,
            minutes=time_window_minutes
        )
        return count >= threshold

    async def get_fraud_statistics(self, hours: int = 24) -> dict:
        """
        Get fraud detection statistics.

        Args:
            hours: Time window in hours

        Returns:
            Dictionary with fraud statistics
        """
        suspicious_txns = await self.transaction_repo.get_suspicious_transactions(
            hours=hours,
            limit=10000
        )

        high_risk = [txn for txn in suspicious_txns if txn.fraud_score > 0.8]
        medium_risk = [txn for txn in suspicious_txns if 0.6 <= txn.fraud_score <= 0.8]

        return {
            "total_suspicious": len(suspicious_txns),
            "high_risk_count": len(high_risk),
            "medium_risk_count": len(medium_risk),
            "period_hours": hours
        }
