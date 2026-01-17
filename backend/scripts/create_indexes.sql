-- TechMart Database Performance Optimization (Challenge D)
-- Strategic indexes and materialized views for sub-200ms response times

-- ============================================================================
-- STRATEGIC INDEXES
-- ============================================================================

-- Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity) WHERE stock_quantity < 20;
CREATE INDEX IF NOT EXISTS idx_products_reorder_threshold ON products(reorder_threshold) WHERE stock_quantity < reorder_threshold;
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Transactions Indexes (Critical for performance)
CREATE INDEX IF NOT EXISTS idx_transactions_customer_timestamp ON transactions(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_product_timestamp ON transactions(product_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status_timestamp ON transactions(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_suspicious ON transactions(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_fraud_score ON transactions(fraud_score) WHERE fraud_score > 0.5;
CREATE INDEX IF NOT EXISTS idx_transactions_amount_desc ON transactions(total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);

-- Customers Indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_risk_score ON customers(risk_score) WHERE risk_score > 0.5;
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_tier ON customers(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_customers_registration_date ON customers(registration_date);

-- Suppliers Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_reliability_score ON suppliers(reliability_score);
CREATE INDEX IF NOT EXISTS idx_suppliers_country ON suppliers(country);

-- Alerts Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(created_at DESC) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_type_severity ON alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_created ON alerts(severity, created_at DESC);

-- Customer Purchase Patterns Indexes
CREATE INDEX IF NOT EXISTS idx_customer_patterns_last_purchase ON customer_purchase_patterns(last_purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_patterns_avg_amount ON customer_purchase_patterns(average_transaction_amount);

-- Reorder Suggestions Indexes
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_status ON reorder_suggestions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_urgency ON reorder_suggestions(urgency_score DESC);

-- ============================================================================
-- MATERIALIZED VIEWS
-- ============================================================================

-- Hourly Sales Aggregation (refreshed every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_sales_mv AS
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as avg_transaction_value,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(CASE WHEN is_suspicious THEN 1 END) as suspicious_count
FROM transactions
WHERE status = 'completed'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_sales_hour ON hourly_sales_mv(hour);

-- Top Products by Sales (refreshed every 30 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS top_products_mv AS
SELECT
    p.id,
    p.name,
    p.category,
    p.stock_quantity,
    p.price,
    p.supplier_id,
    COALESCE(COUNT(t.id), 0) as sales_count,
    COALESCE(SUM(t.total_amount), 0) as total_revenue,
    COALESCE(AVG(t.total_amount), 0) as avg_sale_value
FROM products p
LEFT JOIN transactions t ON p.id = t.product_id AND t.status = 'completed' AND t.timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY p.id, p.name, p.category, p.stock_quantity, p.price, p.supplier_id
ORDER BY total_revenue DESC NULLS LAST;

CREATE UNIQUE INDEX IF NOT EXISTS idx_top_products_id ON top_products_mv(id);
CREATE INDEX IF NOT EXISTS idx_top_products_category ON top_products_mv(category);
CREATE INDEX IF NOT EXISTS idx_top_products_revenue ON top_products_mv(total_revenue DESC);

-- Dashboard Overview Cache (refreshed every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_overview_mv AS
SELECT
    -- Sales metrics (24h)
    (SELECT COALESCE(SUM(total_amount), 0)
     FROM transactions
     WHERE status = 'completed'
     AND timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours') as sales_24h,

    -- Active customers (24h)
    (SELECT COUNT(DISTINCT customer_id)
     FROM transactions
     WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours') as active_customers_24h,

    -- Transactions count (24h)
    (SELECT COUNT(*)
     FROM transactions
     WHERE status = 'completed'
     AND timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours') as transactions_24h,

    -- Active alerts
    (SELECT COUNT(*)
     FROM alerts
     WHERE is_resolved = FALSE) as active_alerts,

    -- Low stock products
    (SELECT COUNT(*)
     FROM products
     WHERE stock_quantity < reorder_threshold) as low_stock_products,

    -- Suspicious transactions (24h)
    (SELECT COUNT(*)
     FROM transactions
     WHERE is_suspicious = TRUE
     AND timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours') as suspicious_transactions_24h,

    -- Total products
    (SELECT COUNT(*) FROM products) as total_products,

    -- Total customers
    (SELECT COUNT(*) FROM customers) as total_customers,

    -- Average order value (24h)
    (SELECT COALESCE(AVG(total_amount), 0)
     FROM transactions
     WHERE status = 'completed'
     AND timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours') as avg_order_value_24h,

    CURRENT_TIMESTAMP as last_updated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_overview_last_updated ON dashboard_overview_mv(last_updated);

-- Category Performance (refreshed every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS category_performance_mv AS
SELECT
    p.category,
    COUNT(DISTINCT p.id) as product_count,
    COALESCE(SUM(t.total_amount), 0) as total_revenue,
    COALESCE(COUNT(t.id), 0) as transaction_count,
    COALESCE(AVG(t.total_amount), 0) as avg_transaction_value,
    COALESCE(SUM(t.quantity), 0) as items_sold,
    (SELECT COUNT(DISTINCT customer_id)
     FROM transactions t2
     JOIN products p2 ON t2.product_id = p2.id
     WHERE p2.category = p.category
     AND t2.status = 'completed'
     AND t2.timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days') as unique_buyers_30d
FROM products p
LEFT JOIN transactions t ON p.id = t.product_id AND t.status = 'completed' AND t.timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY p.category
ORDER BY total_revenue DESC NULLS LAST;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_performance_category ON category_performance_mv(category);

-- Customer Segments (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS customer_segments_mv AS
SELECT
    COALESCE(loyalty_tier, 'standard') as loyalty_tier,
    COUNT(*) as customer_count,
    SUM(total_spent) as total_revenue,
    AVG(total_spent) as avg_spent_per_customer,
    AVG(risk_score) as avg_risk_score,
    (SELECT COUNT(*)
     FROM customer_purchase_patterns cpp
     JOIN customers c ON cpp.customer_id = c.id
     WHERE COALESCE(c.loyalty_tier, 'standard') = COALESCE(customer_segments_mv.loyalty_tier, 'standard')) as active_customers
FROM customers
GROUP BY COALESCE(loyalty_tier, 'standard')
ORDER BY total_revenue DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_segments_tier ON customer_segments_mv(loyalty_tier);

-- Supplier Performance (refreshed every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS supplier_performance_mv AS
SELECT
    s.id,
    s.name,
    s.country,
    s.reliability_score,
    s.average_delivery_days,
    COUNT(DISTINCT p.id) as product_count,
    COALESCE(SUM(p.stock_quantity), 0) as total_stock,
    COALESCE(AVG(p.price), 0) as avg_product_price
FROM suppliers s
LEFT JOIN products p ON s.id = p.supplier_id
GROUP BY s.id, s.name, s.country, s.reliability_score, s.average_delivery_days
ORDER BY product_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_performance_id ON supplier_performance_mv(id);

-- ============================================================================
-- FUNCTIONS TO REFRESH MATERIALIZED VIEWS
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_overview_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_sales_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_products_mv;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_overview_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_sales_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_products_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_performance_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY customer_segments_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_performance_mv;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC CACHE INVALIDATION
-- ============================================================================

-- Trigger to flag dashboard refresh on transaction changes
CREATE OR REPLACE FUNCTION flag_dashboard_refresh()
RETURNS trigger AS $$
BEGIN
    -- This would typically notify a background job to refresh views
    -- For now, we'll just update a timestamp
    PERFORM pg_notify('dashboard_refresh', 'transaction_changed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transaction_dashboard_refresh
AFTER INSERT OR UPDATE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION flag_dashboard_refresh();

-- ============================================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZER
-- ============================================================================

ANALYZE products;
ANALYZE transactions;
ANALYZE customers;
ANALYZE suppliers;
ANALYZE alerts;
ANALYZE customer_purchase_patterns;
ANALYZE reorder_suggestions;
