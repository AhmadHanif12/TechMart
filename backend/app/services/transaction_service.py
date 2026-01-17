"""Transaction service with business logic."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transaction_repository import TransactionRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.customer_repository import CustomerRepository
from app.services.fraud_detection_service import FraudDetectionService
from app.models.transaction import Transaction
from app.websocket import manager
from app.cache import CacheManager


class TransactionService:
    """Service for transaction operations."""

    def __init__(self, db: AsyncSession, cache: CacheManager = None):
        self.db = db
        self.cache = cache
        self.transaction_repo = TransactionRepository(db)
        self.product_repo = ProductRepository(db)
        self.customer_repo = CustomerRepository(db)
        self.fraud_service = FraudDetectionService(db)

    async def create_transaction(
        self,
        customer_id: int,
        product_id: int,
        quantity: int,
        payment_method: str,
        ip_address: str = None,
        discount_applied: float = 0.0,
        shipping_cost: float = 0.0
    ) -> dict:
        """
        Create a new transaction with validation and fraud detection.

        Args:
            customer_id: Customer ID
            product_id: Product ID
            quantity: Quantity to purchase
            payment_method: Payment method
            ip_address: Customer IP
            discount_applied: Discount amount
            shipping_cost: Shipping cost

        Returns:
            Dictionary with transaction data and status
        """
        # Validation: Check customer exists
        customer = await self.customer_repo.get_by_id(customer_id)
        if not customer:
            raise ValueError(f"Customer {customer_id} not found")

        # Validation: Check product exists
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")

        # Validation: Check stock availability
        if product.stock_quantity < quantity:
            raise ValueError(
                f"Insufficient stock for {product.name}. "
                f"Available: {product.stock_quantity}, Requested: {quantity}"
            )

        # Calculate amounts
        unit_price = float(product.price)
        subtotal = unit_price * quantity
        tax_rate = 0.08  # 8% tax
        tax_amount = subtotal * tax_rate
        total_amount = subtotal + tax_amount + shipping_cost - discount_applied

        # Validation: Amount must be positive
        if total_amount < 0.01:
            raise ValueError(f"Transaction amount must be at least $0.01")

        # Fraud detection
        is_suspicious, fraud_score, fraud_reason = await self.fraud_service.analyze_transaction(
            customer_id=customer_id,
            amount=total_amount,
            ip_address=ip_address
        )

        # Create transaction
        transaction_data = {
            "customer_id": customer_id,
            "product_id": product_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "total_amount": total_amount,
            "status": "completed",  # Auto-complete for now
            "payment_method": payment_method,
            "ip_address": ip_address,
            "discount_applied": discount_applied,
            "tax_amount": tax_amount,
            "shipping_cost": shipping_cost,
            "is_suspicious": is_suspicious,
            "fraud_score": fraud_score
        }

        transaction = await self.transaction_repo.create(**transaction_data)

        # Update product stock (will trigger database trigger as well)
        await self.product_repo.update_stock(product_id, -quantity)

        # Update customer total_spent
        customer.total_spent = float(customer.total_spent) + total_amount
        await self.db.commit()  # Commit before broadcasting

        # Invalidate dashboard cache so the next request gets fresh data
        if self.cache:
            await self.cache.delete("dashboard:overview:24h")

        # Broadcast new transaction to WebSocket subscribers
        transaction_dict = {
            "id": transaction.id,
            "customer_id": customer_id,
            "product_id": product_id,
            "product_name": product.name,
            "quantity": quantity,
            "total_amount": total_amount,
            "status": transaction.status,
            "timestamp": transaction.timestamp.isoformat(),
            "is_suspicious": is_suspicious,
            "fraud_score": fraud_score
        }

        # Use the helper function from websocket module
        from app.websocket import broadcast_new_transaction
        await broadcast_new_transaction(transaction_dict)

        # Broadcast dashboard update
        from app.websocket import broadcast_dashboard_metrics
        # Get updated dashboard metrics (simplified version)
        dashboard_update = {
            "recent_transaction": transaction_dict
        }
        await broadcast_dashboard_metrics(dashboard_update)

        return {
            "transaction_id": transaction.id,
            "total_amount": total_amount,
            "status": transaction.status,
            "is_suspicious": is_suspicious,
            "fraud_score": fraud_score,
            "fraud_reason": fraud_reason if is_suspicious else None,
            "created_at": transaction.created_at.isoformat()
        }

    async def get_transaction_details(self, transaction_id: int) -> Optional[dict]:
        """
        Get transaction with full details.

        Args:
            transaction_id: Transaction ID

        Returns:
            Dictionary with transaction details
        """
        transaction = await self.transaction_repo.get_with_relations(transaction_id)
        if not transaction:
            return None

        return {
            "id": transaction.id,
            "customer": {
                "id": transaction.customer.id,
                "email": transaction.customer.email,
                "full_name": transaction.customer.full_name
            },
            "product": {
                "id": transaction.product.id,
                "name": transaction.product.name,
                "sku": transaction.product.sku
            },
            "quantity": transaction.quantity,
            "unit_price": float(transaction.unit_price),
            "total_amount": float(transaction.total_amount),
            "status": transaction.status,
            "payment_method": transaction.payment_method,
            "timestamp": transaction.timestamp.isoformat(),
            "is_suspicious": transaction.is_suspicious,
            "fraud_score": float(transaction.fraud_score) if transaction.fraud_score else 0.0
        }
