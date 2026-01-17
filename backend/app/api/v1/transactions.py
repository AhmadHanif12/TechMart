"""Transaction API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.dependencies import get_db_session, get_cache_manager
from app.services.transaction_service import TransactionService
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.transaction import TransactionCreate, TransactionResponse

router = APIRouter()


@router.post("/", status_code=201)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: AsyncSession = Depends(get_db_session),
    cache = Depends(get_cache_manager)
):
    """
    Create a new transaction with validation and fraud detection.

    Validates:
    - Customer exists
    - Product exists
    - Stock availability
    - Amount within limits ($0.01 - $10,000)

    Returns transaction details with fraud analysis.
    """
    service = TransactionService(db, cache)

    try:
        result = await service.create_transaction(
            customer_id=transaction_data.customer_id,
            product_id=transaction_data.product_id,
            quantity=transaction_data.quantity,
            payment_method=transaction_data.payment_method,
            ip_address=transaction_data.ip_address,
            discount_applied=transaction_data.discount_applied,
            shipping_cost=transaction_data.shipping_cost
        )

        # The service returns a dict with transaction_id key
        return TransactionResponse(
            transaction_id=result['transaction_id'],
            total_amount=result['total_amount'],
            status=result['status'],
            is_suspicious=result['is_suspicious'],
            fraud_score=result['fraud_score'],
            fraud_reason=result.get('fraud_reason'),
            created_at=result['created_at']
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create transaction: {str(e)}")


@router.get("/suspicious")
async def get_suspicious_transactions(
    hours: Optional[int] = Query(24, ge=1, le=720, description="Hours to look back"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get suspicious transactions flagged by fraud detection.

    Returns transactions with:
    - is_suspicious = true, OR
    - fraud_score > 0.7

    Includes customer and product details.
    """
    repo = TransactionRepository(db)
    transactions = await repo.get_suspicious_transactions(
        hours=hours,
        skip=skip,
        limit=limit
    )

    results = []
    for txn in transactions:
        results.append({
            "id": txn.id,
            "customer_id": txn.customer_id,
            "customer_email": txn.customer.email if txn.customer else None,
            "product_id": txn.product_id,
            "product_name": txn.product.name if txn.product else None,
            "total_amount": float(txn.total_amount),
            "fraud_score": float(txn.fraud_score) if txn.fraud_score else 0.0,
            "is_suspicious": txn.is_suspicious,
            "timestamp": txn.timestamp.isoformat(),
            "status": txn.status
        })

    return {
        "success": True,
        "data": results,
        "metadata": {
            "count": len(results),
            "skip": skip,
            "limit": limit
        },
        "error": None
    }


@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Get transaction details by ID."""
    service = TransactionService(db)
    transaction = await service.get_transaction_details(transaction_id)

    if not transaction:
        raise HTTPException(status_code=404, detail=f"Transaction {transaction_id} not found")

    return {
        "success": True,
        "data": transaction,
        "error": None
    }


@router.get("/")
async def list_transactions(
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    hours: int = Query(24, ge=1, le=720, description="Hours to look back"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    db: AsyncSession = Depends(get_db_session)
):
    """
    List transactions with optional filters.

    Filters:
    - customer_id: Get transactions for specific customer
    - status: Filter by status (pending, completed, failed, refunded)
    - hours: Time window to look back
    """
    repo = TransactionRepository(db)

    if customer_id:
        transactions = await repo.get_by_customer(customer_id, skip=skip, limit=limit)
    elif status:
        transactions = await repo.get_by_status(status, skip=skip, limit=limit)
    else:
        transactions = await repo.get_recent_transactions(hours=hours, limit=limit)

    results = []
    for txn in transactions:
        results.append({
            "id": txn.id,
            "customer_id": txn.customer_id,
            "product_id": txn.product_id,
            "quantity": txn.quantity,
            "total_amount": float(txn.total_amount),
            "status": txn.status,
            "timestamp": txn.timestamp.isoformat(),
            "is_suspicious": txn.is_suspicious
        })

    return {
        "success": True,
        "data": results,
        "metadata": {
            "count": len(results),
            "skip": skip,
            "limit": limit
        },
        "error": None
    }
