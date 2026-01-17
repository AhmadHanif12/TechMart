"""Celery application configuration for background tasks."""
from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "techmart",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.inventory_tasks", "app.tasks.analytics_tasks"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    result_expires=3600,  # Results expire after 1 hour
    task_acks_late=True,  # Acknowledge after task execution
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    # Dashboard metrics - refresh every 1 minute for real-time updates
    'refresh-dashboard-views': {
        'task': 'app.tasks.analytics_tasks.refresh_dashboard_views',
        'schedule': crontab(minute='*/1'),  # Every 1 minute
    },
    # All materialized views - refresh every 5 minutes
    'refresh-materialized-views': {
        'task': 'app.tasks.analytics_tasks.refresh_materialized_views',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    # Customer purchase patterns - every 4 hours
    'update-customer-patterns': {
        'task': 'app.tasks.analytics_tasks.update_customer_patterns',
        'schedule': crontab(hour='*/4'),  # Every 4 hours
    },
    # Daily sales report - every day at midnight
    'generate-daily-report': {
        'task': 'app.tasks.analytics_tasks.generate_daily_report',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    # Slow query analysis - weekly on Sunday at 2 AM
    'analyze-slow-queries': {
        'task': 'app.tasks.analytics_tasks.analyze_slow_queries',
        'schedule': crontab(day_of_week=0, hour=2, minute=0),  # Weekly Sunday 2 AM
    },
    # Inventory predictions (Challenge B) - every 6 hours
    'refresh-inventory-predictions': {
        'task': 'app.tasks.inventory_tasks.refresh_predictions',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
    # Reorder suggestions (Challenge B) - every 12 hours
    'generate-reorder-suggestions': {
        'task': 'app.tasks.inventory_tasks.generate_reorder_suggestions',
        'schedule': crontab(hour='*/12'),  # Every 12 hours
    },
    # Stock level alerts (Challenge B) - every hour
    'check-stock-levels': {
        'task': 'app.tasks.inventory_tasks.check_stock_levels',
        'schedule': crontab(minute='*/60'),  # Every hour
    },
}

# Optional: Configure result backend
celery_app.conf.result_backend_transport_options = {
    'retry_policy': {
        'timeout': 5.0
    }
}
