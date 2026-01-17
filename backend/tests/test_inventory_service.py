"""
Unit tests for Inventory Service (Challenge B).

Tests demand forecasting, supplier optimization, and reorder suggestions.
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.inventory_service import InventoryService


class TestDemandForecasting:
    """Test demand forecasting algorithms."""

    @pytest.fixture
    def inventory_service(self):
        """Create inventory service with mocked database."""
        db_mock = AsyncMock()
        return InventoryService(db_mock)

    def test_calculate_moving_average(self, inventory_service):
        """Test moving average calculation."""
        # Test with sufficient data
        data = [10, 12, 15, 13, 14, 16, 18]
        result = inventory_service.calculate_moving_average(data, window=3)
        expected = (16 + 14 + 18) / 3  # Last 3 values
        assert result == pytest.approx(expected, abs=0.01)

        # Test with insufficient data
        data = [10, 12]
        result = inventory_service.calculate_moving_average(data, window=5)
        expected = 11.0  # Average of all
        assert result == expected

        # Test with empty data
        result = inventory_service.calculate_moving_average([], window=3)
        assert result == 0.0

    def test_calculate_trend_factor(self, inventory_service):
        """Test trend factor calculation."""
        # Test growth trend
        data = [10, 12, 15, 18, 20, 25]
        result = inventory_service.calculate_trend_factor(data)
        assert result > 1.0  # Growing trend
        assert result <= 2.0  # Capped at 2.0

        # Test decline trend
        data = [25, 20, 18, 15, 12, 10]
        result = inventory_service.calculate_trend_factor(data)
        assert result < 1.0  # Declining trend
        assert result >= 0.5  # Capped at 0.5

        # Test flat trend
        data = [10, 10, 10, 10, 10, 10]
        result = inventory_service.calculate_trend_factor(data)
        assert result == pytest.approx(1.0, abs=0.1)

        # Test with insufficient data
        data = [10]
        result = inventory_service.calculate_trend_factor(data)
        assert result == 1.0

    def test_detect_seasonality(self, inventory_service):
        """Test seasonality detection."""
        # High variation (strong seasonality)
        data = [10, 50, 10, 50, 10, 50, 10, 50]
        result = inventory_service.detect_seasonality(data)
        assert result > 1.0  # Seasonality factor > 1
        assert result <= 1.3  # Capped at 1.3

        # Low variation (weak seasonality)
        data = [10, 11, 10, 11, 10, 11, 10, 11]
        result = inventory_service.detect_seasonality(data)
        assert result >= 0.8  # Min cap
        assert result <= 1.2

        # Insufficient data
        data = [10, 12]
        result = inventory_service.detect_seasonality(data)
        assert result == 1.0

    @pytest.mark.asyncio
    async def test_forecast_demand(self, inventory_service):
        """Test complete demand forecasting."""
        product_id = 1
        horizon_days = 7

        # Mock historical sales data
        sales_data = [10, 12, 15, 13, 14, 16, 18, 20, 22, 21, 23, 25, 27, 28]

        with patch.object(inventory_service, 'get_daily_sales_data', return_value=sales_data):
            forecast = await inventory_service.forecast_demand(product_id, horizon_days)

            # Validate forecast structure
            assert 'predicted_demand' in forecast
            assert 'confidence_score' in forecast
            assert 'trend_factor' in forecast
            assert 'seasonality_factor' in forecast

            # Validate values
            assert forecast['predicted_demand'] > 0
            assert 0 <= forecast['confidence_score'] <= 1.0
            assert 0.5 <= forecast['trend_factor'] <= 2.0
            assert 0.8 <= forecast['seasonality_factor'] <= 1.3

    @pytest.mark.asyncio
    async def test_forecast_demand_no_data(self, inventory_service):
        """Test forecast with no historical data."""
        product_id = 1
        horizon_days = 7

        with patch.object(inventory_service, 'get_daily_sales_data', return_value=[]):
            forecast = await inventory_service.forecast_demand(product_id, horizon_days)

            # Should return zero demand with zero confidence
            assert forecast['predicted_demand'] == 0
            assert forecast['confidence_score'] == 0.0
            assert forecast['trend_factor'] == 1.0
            assert forecast['seasonality_factor'] == 1.0


class TestSupplierOptimization:
    """Test multi-supplier optimization."""

    @pytest.fixture
    def inventory_service(self):
        """Create inventory service with mocked database."""
        db_mock = AsyncMock()
        return InventoryService(db_mock)

    @pytest.fixture
    def mock_suppliers(self):
        """Create mock supplier data."""
        suppliers = [
            MagicMock(
                id=1,
                name="Supplier A",
                reliability_score=Decimal("0.95"),
                average_delivery_days=5
            ),
            MagicMock(
                id=2,
                name="Supplier B",
                reliability_score=Decimal("0.85"),
                average_delivery_days=3
            ),
            MagicMock(
                id=3,
                name="Supplier C",
                reliability_score=Decimal("0.90"),
                average_delivery_days=7
            ),
        ]
        return suppliers

    @pytest.mark.asyncio
    async def test_select_optimal_supplier(self, inventory_service, mock_suppliers):
        """Test optimal supplier selection."""
        product_id = 1

        # Mock database queries
        mock_product = MagicMock(supplier_id=1)
        inventory_service.product_repo = AsyncMock()
        inventory_service.product_repo.get_with_supplier.return_value = mock_product

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_suppliers
        inventory_service.db.execute = AsyncMock(return_value=mock_result)

        # Select optimal supplier
        optimal_id = await inventory_service.select_optimal_supplier(product_id)

        # Should return a valid supplier ID
        assert optimal_id in [1, 2, 3]

    @pytest.mark.asyncio
    async def test_select_optimal_supplier_no_product(self, inventory_service):
        """Test supplier selection when product doesn't exist."""
        product_id = 999

        inventory_service.product_repo = AsyncMock()
        inventory_service.product_repo.get_with_supplier.return_value = None

        result = await inventory_service.select_optimal_supplier(product_id)
        assert result is None


class TestReorderSuggestions:
    """Test automated reorder suggestions."""

    @pytest.fixture
    def inventory_service(self):
        """Create inventory service with mocked database."""
        db_mock = AsyncMock()
        return InventoryService(db_mock)

    @pytest.fixture
    def mock_product(self):
        """Create mock product data."""
        mock_supplier = MagicMock(
            average_delivery_days=5
        )

        product = MagicMock(
            id=1,
            name="Test Product",
            stock_quantity=10,
            reorder_threshold=50,
            reorder_quantity=100,
            supplier=mock_supplier
        )
        return product

    @pytest.mark.asyncio
    async def test_generate_reorder_suggestion(self, inventory_service, mock_product):
        """Test reorder suggestion generation."""
        product_id = 1

        # Mock product retrieval
        inventory_service.product_repo = AsyncMock()
        inventory_service.product_repo.get_with_supplier.return_value = mock_product

        # Mock demand forecast
        mock_forecast = {
            "predicted_demand": 140,  # 14 days * 10/day
            "confidence_score": 0.92,
            "trend_factor": 1.1,
            "seasonality_factor": 1.0
        }

        with patch.object(inventory_service, 'forecast_demand', return_value=mock_forecast):
            with patch.object(inventory_service, 'select_optimal_supplier', return_value=7):
                suggestion = await inventory_service.generate_reorder_suggestion(product_id)

                # Validate suggestion
                assert suggestion is not None
                assert suggestion['product_id'] == product_id
                assert suggestion['suggested_quantity'] > 0
                assert suggestion['suggested_supplier_id'] == 7
                assert 0 <= suggestion['urgency_score'] <= 1.0
                assert 'estimated_stockout_date' in suggestion
                assert 'reasoning' in suggestion

    @pytest.mark.asyncio
    async def test_generate_reorder_suggestion_sufficient_stock(self, inventory_service):
        """Test that no suggestion is generated when stock is sufficient."""
        product_id = 1

        # Mock product with sufficient stock
        mock_product = MagicMock(
            stock_quantity=100,
            reorder_threshold=50
        )

        inventory_service.product_repo = AsyncMock()
        inventory_service.product_repo.get_with_supplier.return_value = mock_product

        suggestion = await inventory_service.generate_reorder_suggestion(product_id)

        # Should return None when stock is above threshold
        assert suggestion is None

    @pytest.mark.asyncio
    async def test_generate_reorder_suggestion_nonexistent_product(self, inventory_service):
        """Test suggestion generation for nonexistent product."""
        product_id = 999

        inventory_service.product_repo = AsyncMock()
        inventory_service.product_repo.get_with_supplier.return_value = None

        suggestion = await inventory_service.generate_reorder_suggestion(product_id)
        assert suggestion is None


class TestIntegration:
    """Integration tests for inventory service."""

    @pytest.fixture
    def inventory_service(self):
        """Create inventory service with mocked database."""
        db_mock = AsyncMock()
        return InventoryService(db_mock)

    @pytest.mark.asyncio
    async def test_complete_inventory_workflow(self, inventory_service):
        """Test complete inventory management workflow."""
        product_id = 1

        # Mock product with low stock
        mock_supplier = MagicMock(
            average_delivery_days=5,
            reliability_score=Decimal("0.95")
        )

        mock_product = MagicMock(
            id=product_id,
            name="Test Product",
            stock_quantity=10,
            reorder_threshold=50,
            reorder_quantity=100,
            supplier=mock_supplier
        )

        # Mock sales data
        sales_data = [8, 9, 10, 11, 12, 10, 11]

        # Mock database operations
        inventory_service.product_repo = AsyncMock()
        inventory_service.product_repo.get_with_supplier.return_value = mock_product

        with patch.object(inventory_service, 'get_daily_sales_data', return_value=sales_data):
            with patch.object(inventory_service, 'select_optimal_supplier', return_value=7):
                # Step 1: Forecast demand
                forecast = await inventory_service.forecast_demand(product_id, horizon_days=14)
                assert forecast['predicted_demand'] > 0
                assert forecast['confidence_score'] > 0

                # Step 2: Generate reorder suggestion
                suggestion = await inventory_service.generate_reorder_suggestion(product_id)
                assert suggestion is not None
                assert suggestion['product_id'] == product_id

                # Step 3: Verify urgency is calculated
                assert 'urgency_score' in suggestion
                assert suggestion['urgency_score'] > 0  # Low stock should have urgency

                # Step 4: Verify supplier is selected
                assert suggestion['suggested_supplier_id'] == 7


def test_calculation_accuracy():
    """Test accuracy of mathematical calculations."""
    service = InventoryService(AsyncMock())

    # Test moving average precision
    data = [1.5, 2.3, 3.7, 4.2, 5.1]
    ma = service.calculate_moving_average(data, window=3)
    expected = (3.7 + 4.2 + 5.1) / 3
    assert abs(ma - expected) < 0.001

    # Test trend factor precision
    data = [10.0, 15.0, 20.0, 25.0]
    trend = service.calculate_trend_factor(data)
    # Second half (20, 25) vs first half (10, 15)
    # (22.5) / (12.5) = 1.8
    assert 1.7 < trend < 1.9


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
