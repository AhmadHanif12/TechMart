/**
 * Low Stock Table Component
 *
 * Displays products that are below their reorder threshold.
 * Part of Challenge B: Advanced Inventory Management.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  WarningOutlined,
  TrendingUpOutlined,
  RefreshOutlined,
} from '@mui/icons-material';
import { inventoryApi } from '../../services/api';

export interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock_quantity: number;
  reorder_threshold: number;
  reorder_quantity: number;
  price: number;
  supplier_name?: string;
}

const LowStockTable: React.FC = () => {
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchLowStockProducts = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getLowStock({ limit: 100 });
      if (response.success && response.data) {
        setProducts(response.data.products || response.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getUrgencyLevel = (product: LowStockProduct): 'critical' | 'high' | 'medium' | 'low' => {
    const stockRatio = product.stock_quantity / product.reorder_threshold;
    if (stockRatio === 0) return 'critical';
    if (stockRatio < 0.25) return 'high';
    if (stockRatio < 0.5) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (urgency: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (urgency) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const calculateStockPercentage = (product: LowStockProduct): number => {
    return Math.min((product.stock_quantity / product.reorder_threshold) * 100, 100);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningOutlined color="error" />
              Low Stock Products
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Products below reorder threshold requiring attention
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={fetchLowStockProducts} disabled={loading}>
                <RefreshOutlined />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {loading ? (
          <Box sx={{ py: 3 }}>
            <LinearProgress />
          </Box>
        ) : products.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No products are currently below reorder threshold.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Stock Level</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Urgency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((product) => {
                      const urgency = getUrgencyLevel(product);
                      const stockPercentage = calculateStockPercentage(product);

                      return (
                        <TableRow key={product.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {product.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {product.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={product.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {product.stock_quantity} / {product.reorder_threshold}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={stockPercentage}
                                  sx={{
                                    flex: 1,
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0,0,0,0.08)',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: urgency === 'critical' ? '#f44336' :
                                             urgency === 'high' ? '#ff9800' :
                                             urgency === 'medium' ? '#2196f3' : '#4caf50',
                                    },
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {Math.round(stockPercentage)}%
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ${product.price.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={urgency.toUpperCase()}
                              size="small"
                              color={getUrgencyColor(urgency)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={products.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ border: 'none' }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LowStockTable;
