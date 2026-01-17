"""Inventory management service with demand forecasting (Challenge B)."""
from typing import List, Tuple, Optional
from datetime import datetime, timedelta, date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import statistics

from app.repositories.product_repository import ProductRepository
from app.repositories.inventory_repository import (
    InventoryPredictionRepository,
    ReorderSuggestionRepository
)
from app.repositories.transaction_repository import TransactionRepository
from app.models.supplier import Supplier
from app.models.inventory_prediction import InventoryPrediction
from app.models.reorder_suggestion import ReorderSuggestion


class InventoryService:
    """Service for inventory management and demand forecasting."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.prediction_repo = InventoryPredictionRepository(db)
        self.reorder_repo = ReorderSuggestionRepository(db)
        self.transaction_repo = TransactionRepository(db)

    async def get_daily_sales_data(
        self,
        product_id: int,
        days: int = 90
    ) -> List[float]:
        """
        Get daily sales quantities for a product.

        Args:
            product_id: Product ID
            days: Number of days to look back

        Returns:
            List of daily sales quantities
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Get transactions for product
        result = await self.db.execute(
            select(
                func.date(Transaction.timestamp).label('date'),
                func.sum(Transaction.quantity).label('daily_quantity')
            )
            .where(
                and_(
                    Transaction.product_id == product_id,
                    Transaction.status == 'completed',
                    Transaction.timestamp >= cutoff_date
                )
            )
            .group_by(func.date(Transaction.timestamp))
            .order_by(func.date(Transaction.timestamp))
        )

        daily_sales = [float(row.daily_quantity) for row in result.all()]
        return daily_sales if daily_sales else [0.0]

    def calculate_moving_average(
        self,
        data: List[float],
        window: int
    ) -> float:
        """
        Calculate moving average.

        Args:
            data: Time series data
            window: Window size

        Returns:
            Moving average value
        """
        if not data or len(data) < window:
            return sum(data) / len(data) if data else 0.0

        recent_data = data[-window:]
        return sum(recent_data) / len(recent_data)

    def calculate_trend_factor(self, data: List[float]) -> float:
        """
        Calculate trend factor (growth or decline).

        Args:
            data: Time series data

        Returns:
            Trend factor (1.0 = no trend, >1.0 = growth, <1.0 = decline)
        """
        if not data or len(data) < 2:
            return 1.0

        # Compare first half vs second half
        mid = len(data) // 2
        first_half_avg = sum(data[:mid]) / mid if mid > 0 else 0
        second_half_avg = sum(data[mid:]) / (len(data) - mid)

        if first_half_avg == 0:
            return 1.0

        trend = second_half_avg / first_half_avg
        # Cap trend factor between 0.5 and 2.0
        return max(0.5, min(2.0, trend))

    def detect_seasonality(self, data: List[float]) -> float:
        """
        Detect seasonality patterns (simplified).

        Args:
            data: Time series data

        Returns:
            Seasonality factor
        """
        if not data or len(data) < 7:
            return 1.0

        # Simple day-of-week pattern detection
        # Check if weekends are different from weekdays
        try:
            std_dev = statistics.stdev(data) if len(data) > 1 else 0
            mean_val = statistics.mean(data)

            if mean_val == 0:
                return 1.0

            # Higher std dev indicates more variation (potential seasonality)
            coefficient_of_variation = std_dev / mean_val
            seasonality = 1.0 + (coefficient_of_variation * 0.2)

            return max(0.8, min(1.3, seasonality))
        except:
            return 1.0

    async def forecast_demand(
        self,
        product_id: int,
        horizon_days: int = 7
    ) -> dict:
        """
        Forecast product demand using hybrid model (Challenge B).

        Args:
            product_id: Product ID
            horizon_days: Forecast horizon in days

        Returns:
            Dictionary with forecast data
        """
        # Get historical sales data
        sales_data = await self.get_daily_sales_data(product_id, days=90)

        if not sales_data:
            return {
                "predicted_demand": 0,
                "confidence_score": 0.0,
                "trend_factor": 1.0,
                "seasonality_factor": 1.0
            }

        # Calculate moving averages
        ma_7 = self.calculate_moving_average(sales_data, window=7)
        ma_30 = self.calculate_moving_average(sales_data, window=30)

        # Calculate trend
        trend_factor = self.calculate_trend_factor(sales_data)

        # Detect seasonality
        seasonality_factor = self.detect_seasonality(sales_data)

        # Forecast formula: weighted MA * trend * seasonality * horizon
        base_daily_demand = (ma_7 * 0.4 + ma_30 * 0.6)
        predicted_demand = int(
            base_daily_demand * trend_factor * seasonality_factor * horizon_days
        )

        # Calculate confidence score based on data availability and consistency
        confidence_score = min(1.0, len(sales_data) / 90)  # More data = higher confidence

        return {
            "predicted_demand": max(0, predicted_demand),
            "confidence_score": round(confidence_score, 2),
            "trend_factor": round(trend_factor, 2),
            "seasonality_factor": round(seasonality_factor, 2)
        }

    async def select_optimal_supplier(
        self,
        product_id: int
    ) -> Optional[int]:
        """
        Select optimal supplier using multi-criteria optimization (Challenge B).

        Args:
            product_id: Product ID

        Returns:
            Optimal supplier ID or None
        """
        # Get product with supplier
        product = await self.product_repo.get_with_supplier(product_id)
        if not product:
            return None

        # Get all suppliers (simplified - in real scenario, get suppliers for this product category)
        result = await self.db.execute(select(Supplier))
        suppliers = result.scalars().all()

        if not suppliers:
            return product.supplier_id

        # Multi-criteria scoring
        scores = []

        for supplier in suppliers:
            # Price score (assuming current supplier's price is baseline)
            # In real scenario, fetch actual prices from a product_supplier_prices table
            price_score = 0.4  # Placeholder - normalized price score

            # Reliability score (already normalized 0-1)
            reliability_score = float(supplier.reliability_score or 0.5) * 0.35

            # Delivery time score (faster is better)
            max_delivery = 14  # Max expected delivery days
            delivery_score = (
                (max_delivery - (supplier.average_delivery_days or 7)) / max_delivery
            ) * 0.25

            total_score = price_score + reliability_score + delivery_score
            scores.append((supplier.id, total_score))

        # Return supplier with highest score
        optimal_supplier = max(scores, key=lambda x: x[1])
        return optimal_supplier[0]

    async def generate_reorder_suggestion(
        self,
        product_id: int
    ) -> Optional[dict]:
        """
        Generate automated reorder suggestion (Challenge B).

        Args:
            product_id: Product ID

        Returns:
            Dictionary with reorder suggestion data
        """
        product = await self.product_repo.get_with_supplier(product_id)
        if not product:
            return None

        # Check if already below threshold
        if product.stock_quantity >= product.reorder_threshold:
            return None

        # Forecast demand for next 14 days
        forecast = await self.forecast_demand(product_id, horizon_days=14)

        # Calculate reorder quantity
        lead_time_days = product.supplier.average_delivery_days or 7
        daily_demand = forecast["predicted_demand"] / 14

        # Safety stock = 3 days of demand
        safety_stock = int(daily_demand * 3)
        reorder_quantity = int(daily_demand * lead_time_days) + safety_stock

        # Ensure minimum order quantity
        reorder_quantity = max(reorder_quantity, product.reorder_quantity)

        # Calculate urgency score (0-1)
        days_until_stockout = product.stock_quantity / daily_demand if daily_demand > 0 else 999
        urgency_score = max(0.0, min(1.0, 1.0 - (days_until_stockout / 14)))

        # Select optimal supplier
        optimal_supplier_id = await self.select_optimal_supplier(product_id)

        # Estimate stockout date
        estimated_stockout = date.today() + timedelta(days=int(days_until_stockout))

        reasoning = (
            f"Current stock: {product.stock_quantity}, "
            f"Daily demand: {int(daily_demand)}, "
            f"Lead time: {lead_time_days} days, "
            f"Forecast confidence: {forecast['confidence_score']}"
        )

        return {
            "product_id": product_id,
            "suggested_quantity": reorder_quantity,
            "suggested_supplier_id": optimal_supplier_id,
            "urgency_score": round(urgency_score, 2),
            "estimated_stockout_date": estimated_stockout,
            "reasoning": reasoning
        }


# Import at the end to avoid circular imports
from app.models.transaction import Transaction
from sqlalchemy import and_
