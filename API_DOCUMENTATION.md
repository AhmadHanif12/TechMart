# TechMart API Documentation

## Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.techmart.com/api/v1
```

## Authentication
Currently using demo mode. JWT authentication ready for implementation.

## Rate Limiting
- **Per IP**: 100 requests/minute
- **Global**: 1000 requests/hour
- **Headers**:
  - `X-RateLimit-Limit`: Rate limit ceiling
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

## Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## Dashboard Endpoints

### GET /dashboard/overview
Get dashboard overview metrics.

**Query Parameters**:
- `period` (optional): `24h`, `7d`, `30d`, `all` (default: `24h`)

**Response**:
```json
{
  "success": true,
  "data": {
    "sales_24h": 569724.56,
    "active_customers_24h": 219,
    "transactions_24h": 250,
    "low_stock_count": 158,
    "suspicious_transactions_24h": 0,
    "active_alerts": 0,
    "total_products": 500,
    "total_customers": 1000,
    "total_sales": 27900000.00,
    "total_transactions": 4979
  }
}
```

---

## Transaction Endpoints

### GET /transactions
List transactions with pagination.

**Query Parameters**:
- `skip` (optional): Offset for pagination (default: 0)
- `limit` (optional): Max results per page (default: 20, max: 100)
- `customer_id` (optional): Filter by customer
- `status` (optional): Filter by status (`completed`, `pending`, `failed`, `refunded`)
- `hours` (optional): Time window in hours (default: 24)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 42,
      "customer_email": "john@example.com",
      "product_id": 15,
      "product_name": "Wireless Mouse",
      "quantity": 2,
      "total_amount": 59.98,
      "status": "completed",
      "is_suspicious": false,
      "fraud_score": 0.12,
      "timestamp": "2026-01-17T10:30:00Z"
    }
  ],
  "metadata": {
    "count": 1,
    "skip": 0,
    "limit": 20
  }
}
```

### GET /transactions/suspicious
Get suspicious transactions flagged by fraud detection.

**Query Parameters**:
- `hours` (optional): Hours to look back (default: 24, max: 720)
- `skip` (optional): Pagination offset
- `limit` (optional): Max results (default: 20, max: 100)

**Response**: Same format as `/transactions`

### POST /transactions
Create a new transaction.

**Request Body**:
```json
{
  "customer_id": 42,
  "product_id": 15,
  "quantity": 2,
  "payment_method": "credit_card",
  "ip_address": "192.168.1.1",
  "discount_applied": 0.0,
  "shipping_cost": 5.99
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "total_amount": 65.97,
    "is_suspicious": false,
    "fraud_score": 0.12,
    "status": "completed",
    "timestamp": "2026-01-17T10:30:00Z"
  }
}
```

---

## Inventory Endpoints

### GET /inventory/low-stock
Get products below reorder threshold.

**Query Parameters**:
- `limit` (optional): Max results (default: 100)

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 15,
        "name": "Wireless Mouse",
        "sku": "WM-001",
        "category": "Electronics",
        "stock_quantity": 8,
        "reorder_threshold": 20,
        "reorder_quantity": 50,
        "price": 29.99,
        "supplier_name": "TechSupply Co"
      }
    ]
  }
}
```

### GET /inventory/predictions/{product_id}
Get demand forecast for a product.

**Path Parameters**:
- `product_id`: Product ID

**Query Parameters**:
- `horizon_days` (optional): Forecast horizon (default: 7, max: 90)

**Response**:
```json
{
  "success": true,
  "data": {
    "product_id": 15,
    "predicted_demand": 145,
    "confidence_score": 0.92,
    "trend_factor": 1.18,
    "seasonality_factor": 1.05,
    "forecast_date": "2026-01-17T10:30:00Z",
    "horizon_days": 14
  }
}
```

### GET /inventory/reorder-suggestions
Get automated reorder suggestions.

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `approved`, `ordered`, `rejected`)
- `skip`, `limit`: Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 15,
      "product_name": "Wireless Mouse",
      "current_stock": 8,
      "suggested_quantity": 120,
      "suggested_supplier_id": 7,
      "suggested_supplier_name": "TechSupply Co",
      "urgency_score": 0.87,
      "estimated_stockout_date": "2026-01-25",
      "reasoning": "Current stock: 8, Daily demand: 12, Lead time: 5 days",
      "status": "pending",
      "created_at": "2026-01-17T10:00:00Z"
    }
  ]
}
```

### POST /inventory/reorder-suggestions/{id}/approve
Approve a reorder suggestion.

**Path Parameters**:
- `id`: Suggestion ID

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Reorder suggestion approved",
    "id": 1,
    "status": "approved"
  }
}
```

---

## Analytics Endpoints

### GET /analytics/hourly-sales
Get hourly sales data.

**Query Parameters**:
- `hours` (optional): Hours to look back (default: 24, max: 168)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "hour": "2026-01-17T10:00:00Z",
      "transaction_count": 15,
      "total_sales": 2345.67,
      "avg_transaction_value": 156.38,
      "unique_customers": 12,
      "suspicious_count": 0
    }
  ]
}
```

### GET /analytics/top-products
Get top products by revenue.

**Query Parameters**:
- `limit` (optional): Max results (default: 10, max: 100)
- `days` (optional): Days to look back (default: 30)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "name": "Wireless Mouse",
      "category": "Electronics",
      "sales_count": 250,
      "total_revenue": 7497.50,
      "avg_sale_value": 29.99
    }
  ]
}
```

---

## Alerts Endpoints

### GET /alerts
List alerts with filtering.

**Query Parameters**:
- `is_resolved` (optional): `true`, `false`, or omit for all
- `severity` (optional): `low`, `medium`, `high`, `critical`
- `alert_type` (optional): Alert type filter
- `skip`, `limit`: Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "alert_type": "stock_low",
      "severity": "high",
      "title": "Low Stock Alert",
      "message": "Product 'Wireless Mouse' is below reorder threshold",
      "is_resolved": false,
      "created_at": "2026-01-17T09:00:00Z",
      "resolved_at": null
    }
  ],
  "metadata": {
    "count": 1,
    "skip": 0,
    "limit": 20
  }
}
```

### POST /alerts
Create a new alert.

**Request Body**:
```json
{
  "alert_type": "stock_low",
  "severity": "high",
  "title": "Low Stock Alert",
  "message": "Product XYZ is below reorder threshold",
  "entity_type": "product",
  "entity_id": 15
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "alert_type": "stock_low",
    "severity": "high",
    "created_at": "2026-01-17T10:30:00Z"
  }
}
```

### PATCH /alerts/{id}/resolve
Mark an alert as resolved.

**Path Parameters**:
- `id`: Alert ID

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Alert 1 resolved"
  }
}
```

---

## WebSocket Endpoints

### WS /ws/dashboard
Real-time dashboard updates.

**Connection**:
```javascript
const socket = io('http://localhost:8000/api/v1/ws/dashboard');

socket.on('connect', () => {
  console.log('Connected');
});

socket.on('dashboard_update', (data) => {
  console.log('Dashboard update:', data);
});

socket.on('new_transaction', (data) => {
  console.log('New transaction:', data);
});

socket.on('stock_update', (data) => {
  console.log('Stock update:', data);
});

socket.on('new_alert', (data) => {
  console.log('New alert:', data);
});
```

**Events**:
- `dashboard_update`: Dashboard metrics changed
- `new_transaction`: New transaction created
- `stock_update`: Product stock changed
- `new_alert`: New alert created

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "data": null,
  "error": "Validation error: quantity must be greater than 0"
}
```

### 404 Not Found
```json
{
  "success": false,
  "data": null,
  "error": "Product with id 999 not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "data": null,
  "error": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "data": null,
  "error": "Internal server error occurred"
}
```

---

## Code Examples

### Python (requests)
```python
import requests

# Get dashboard overview
response = requests.get('http://localhost:8000/api/v1/dashboard/overview')
data = response.json()
print(f"Sales: ${data['data']['sales_24h']}")

# Create transaction
transaction = {
    "customer_id": 42,
    "product_id": 15,
    "quantity": 2,
    "payment_method": "credit_card"
}
response = requests.post(
    'http://localhost:8000/api/v1/transactions',
    json=transaction
)
print(response.json())
```

### JavaScript (Axios)
```javascript
import axios from 'axios';

// Get low stock products
const response = await axios.get('http://localhost:8000/api/v1/inventory/low-stock');
console.log(response.data.data.products);

// Approve reorder suggestion
await axios.post('http://localhost:8000/api/v1/inventory/reorder-suggestions/1/approve');
```

### cURL
```bash
# Get transactions
curl -X GET "http://localhost:8000/api/v1/transactions?limit=10"

# Create alert
curl -X POST "http://localhost:8000/api/v1/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_type": "stock_low",
    "severity": "high",
    "title": "Low Stock Alert",
    "message": "Product XYZ is low"
  }'
```

---

## Interactive API Documentation

Visit http://localhost:8000/docs for interactive Swagger UI documentation with:
- Try-it-out functionality
- Request/response examples
- Schema definitions
- Authentication testing

---

**Last Updated**: 2026-01-17
