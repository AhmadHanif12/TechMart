/**
 * TechMart Analytics Dashboard - Main App Component
 *
 * Entry point for the application with routing setup.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Grid, Card, CardContent, Typography } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import theme from './theme';
import Layout from './components/common/Layout';
import DashboardOverview from './components/dashboard/DashboardOverview';
import LowStockTable from './components/inventory/LowStockTable';
import ReorderSuggestions from './components/inventory/ReorderSuggestions';
import ProductList from './components/inventory/ProductList';
import TransactionList from './components/transactions/TransactionList';
import AnalyticsCharts from './components/analytics/AnalyticsCharts';
import AlertsList from './components/alerts/AlertsList';

// Create React Query client for data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Transactions Page
const TransactionsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Transactions
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View and manage all transactions with fraud detection
      </Typography>

      <TransactionList />
    </Box>
  );
};

// Products Page - Full product catalog with add/edit functionality
const ProductsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Products
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage your product catalog - add, edit, and view all products
      </Typography>

      <ProductList />
    </Box>
  );
};

// Inventory Page - Overview with low stock and reorder suggestions
const InventoryPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Inventory Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Advanced inventory management with demand forecasting and automated reorder suggestions
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <LowStockTable />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ReorderSuggestions />
        </Grid>
      </Grid>
    </Box>
  );
};

// Analytics Page
const AnalyticsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Sales performance, customer insights, and category analysis
      </Typography>

      <AnalyticsCharts />
    </Box>
  );
};

// Alerts Page
const AlertsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Alerts
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        System alerts and notifications management
      </Typography>

      <AlertsList />
    </Box>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            {/* Root route with layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
