/**
 * Analytics Charts Component
 *
 * Displays hourly sales, top products, and category performance charts.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface HourlySales {
  hour: string;
  total_sales: number;
  transaction_count: number;
}

interface TopProduct {
  name: string;
  category: string;
  sales_count: number;
  total_revenue: number;
}

interface CategoryData {
  name: string;
  value: number;
  sales: number;
}

const COLORS = ['#1976d2', '#dc004e', '#ffc107', '#4caf50', '#9c27b0', '#ff9800'];

const AnalyticsCharts: React.FC = () => {
  const [hourlySales, setHourlySales] = useState<HourlySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch hourly sales
      const hourlyResponse = await fetch('http://localhost:8000/api/v1/analytics/hourly-sales?hours=24');
      const hourlyData = await hourlyResponse.json();
      console.log('Hourly sales data:', hourlyData);
      if (hourlyData.success && hourlyData.data) {
        setHourlySales(hourlyData.data);
      }

      // Fetch top products
      const productsResponse = await fetch('http://localhost:8000/api/v1/analytics/top-products?limit=10&days=7');
      const productsData = await productsResponse.json();
      console.log('Top products data:', productsData);
      if (productsData.success && productsData.data) {
        setTopProducts(productsData.data);
      }

      // Fetch category performance
      const categoryResponse = await fetch('http://localhost:8000/api/v1/analytics/category-performance?days=30');
      const categoryResult = await categoryResponse.json();
      console.log('Category data:', categoryResult);
      if (categoryResult.success && categoryResult.data) {
        // Transform category data for pie chart
        const transformedCategories = categoryResult.data.map((cat: any) => ({
          name: cat.category,
          value: cat.total_sales,
          sales: cat.transaction_count,
        }));
        setCategoryData(transformedCategories);
      }

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatHour = (hour: string) => {
    const date = new Date(hour);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <Typography color="text.secondary">Loading analytics...</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Hourly Sales Chart */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Hourly Sales (Last 24 Hours)
            </Typography>
            {hourlySales.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography color="text.secondary">No hourly sales data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHour}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={formatHour}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_sales"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="Total Sales"
                    dot={hourlySales.length === 1}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Top Products Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Top 10 Products by Revenue
            </Typography>
            {topProducts.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography color="text.secondary">No products data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="total_revenue" fill="#1976d2" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Category Performance Pie Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Sales by Category
            </Typography>
            {categoryData.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography color="text.secondary">No category data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AnalyticsCharts;
