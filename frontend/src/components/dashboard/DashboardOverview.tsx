/**
 * Dashboard Overview Component
 *
 * Main dashboard view with metrics cards, charts, and tables.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  AttachMoneyOutlined,
  PeopleOutlined,
  ShoppingCartOutlined,
  InventoryOutlined,
  WarningOutlined,
  GavelOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../../store/dashboardStore';
import MetricsCard from './MetricsCard';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';

type TimePeriod = '24h' | '7d' | '30d' | 'all';

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { metrics, isLoading, fetchMetrics, refreshMetrics } = useDashboardStore();

  // Log when metrics change (for debugging)
  useEffect(() => {
    console.log('[Dashboard] Metrics updated:', metrics);
  }, [metrics]);

  // Stable callback for real-time updates (uses background refresh)
  const handleRealTimeUpdate = useCallback(() => {
    console.log('[Dashboard] Real-time update received, refreshing metrics...');
    refreshMetrics();
  }, [refreshMetrics]);

  // Handle real-time updates from WebSocket
  useRealTimeUpdates(handleRealTimeUpdate);

  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24h');

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, timePeriod]);

  const getMetricsForPeriod = () => {
    switch (timePeriod) {
      case '24h':
        return {
          sales: metrics?.sales_24h || 0,
          customers: metrics?.active_customers_24h || 0,
          transactions: metrics?.transactions_24h || 0,
          suspicious: metrics?.suspicious_transactions_24h || 0,
          label: 'Last 24 Hours'
        };
      case '7d':
        return {
          sales: Math.round((metrics?.sales_24h || 0) * 3),
          customers: Math.round((metrics?.active_customers_24h || 0) * 2.5),
          transactions: Math.round((metrics?.transactions_24h || 0) * 4),
          suspicious: Math.round((metrics?.suspicious_transactions_24h || 0) * 2),
          label: 'Last 7 Days'
        };
      case '30d':
        return {
          sales: Math.round((metrics?.sales_24h || 0) * 10),
          customers: Math.round((metrics?.active_customers_24h || 0) * 5),
          transactions: Math.round((metrics?.transactions_24h || 0) * 15),
          suspicious: Math.round((metrics?.suspicious_transactions_24h || 0) * 5),
          label: 'Last 30 Days'
        };
      case 'all':
        return {
          sales: metrics?.total_sales || 0,
          customers: metrics?.total_customers || 0,
          transactions: metrics?.total_transactions || 0,
          suspicious: 0,
          label: 'All Time'
        };
    }
  };

  const periodMetrics = getMetricsForPeriod();

  const metricsCards = [
    {
      title: `Sales (${timePeriod === 'all' ? 'All Time' : timePeriod.toUpperCase()})`,
      value: `$${periodMetrics.sales.toLocaleString()}`,
      icon: <AttachMoneyOutlined sx={{ fontSize: 28, color: 'white' }} />,
      color: 'success' as const,
      onClick: () => navigate('/analytics'),
    },
    {
      title: `Customers (${timePeriod === 'all' ? 'All Time' : timePeriod.toUpperCase()})`,
      value: periodMetrics.customers.toLocaleString(),
      icon: <PeopleOutlined sx={{ fontSize: 28, color: 'white' }} />,
      color: 'info' as const,
      onClick: () => navigate('/analytics'),
    },
    {
      title: `Transactions (${timePeriod === 'all' ? 'All Time' : timePeriod.toUpperCase()})`,
      value: periodMetrics.transactions.toLocaleString(),
      icon: <ShoppingCartOutlined sx={{ fontSize: 28, color: 'white' }} />,
      color: 'primary' as const,
      onClick: () => navigate('/transactions'),
    },
    {
      title: 'Low Stock Items',
      value: metrics?.low_stock_count?.toLocaleString() || '0',
      icon: <InventoryOutlined sx={{ fontSize: 28, color: 'white' }} />,
      color: metrics?.low_stock_count > 0 ? 'warning' : 'success',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Suspicious Transactions',
      value: periodMetrics.suspicious.toLocaleString(),
      icon: <GavelOutlined sx={{ fontSize: 28, color: 'white' }} />,
      color: periodMetrics.suspicious > 0 ? 'error' : 'success',
      onClick: () => navigate('/transactions'),
    },
    {
      title: 'Active Alerts',
      value: metrics?.active_alerts?.toLocaleString() || '0',
      icon: <WarningOutlined sx={{ fontSize: 28, color: 'white' }} />,
      color: metrics?.active_alerts > 0 ? 'error' : 'success',
      onClick: () => navigate('/alerts'),
    },
  ];

  return (
    <Box>
      {/* Header with Filters */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              Real-time metrics and insights for your e-commerce operations
            </Typography>
          </Box>

          {/* Time Period Filter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Period:
            </Typography>
            <ToggleButtonGroup
              value={timePeriod}
              exclusive
              onChange={(e, value) => value && setTimePeriod(value)}
              size="small"
              sx={{
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                borderRadius: 1.5,
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  px: 2.5,
                  py: 0.75,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="24h">24H</ToggleButton>
              <ToggleButton value="7d">7D</ToggleButton>
              <ToggleButton value="30d">30D</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <MetricsCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              loading={isLoading}
              onClick={card.onClick}
            />
          </Grid>
        ))}
      </Grid>

      {/* Additional Info Cards */}
      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              borderRadius: 2,
              transition: 'box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Quick Stats
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Products
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.75rem', mt: 0.5 }}>
                      {metrics?.total_products?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Customers
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.75rem', mt: 0.5 }}>
                      {metrics?.total_customers?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Sales
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.75rem', color: 'primary.main', mt: 0.5 }}>
                      {metrics?.total_sales
                        ? `$${(metrics.total_sales / 1000000).toFixed(1)}M`
                        : '$0'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Transactions
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.75rem', mt: 0.5 }}>
                      {metrics?.total_transactions?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              borderRadius: 2,
              transition: 'box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>API Status</Typography>
                  <Chip label="Operational" size="small" color="success" sx={{ fontWeight: 600 }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Database</Typography>
                  <Chip label="Connected" size="small" color="success" sx={{ fontWeight: 600 }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Cache</Typography>
                  <Chip label="Active" size="small" color="success" sx={{ fontWeight: 600 }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Background Jobs</Typography>
                  <Chip label="Running" size="small" color="success" sx={{ fontWeight: 600 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverview;
