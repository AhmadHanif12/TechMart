/**
 * Product List Component
 *
 * Displays all products with filtering and add/edit functionality.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Typography,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  RefreshOutlined,
} from '@mui/icons-material';
import ProductForm from './ProductForm';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock_quantity: number;
  reorder_threshold: number;
  supplier?: {
    id: number;
    name: string;
  };
  is_low_stock: boolean;
}

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [page, rowsPerPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const skip = page * rowsPerPage;
      const response = await fetch(
        `http://localhost:8000/api/v1/inventory/products?skip=${skip}&limit=${rowsPerPage}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        const productsData = Array.isArray(data.data) ? data.data : [];
        setProducts(productsData);
        setTotalCount(data.metadata?.total || productsData.length + skip);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddProduct = () => {
    setEditingProductId(null);
    setFormOpen(true);
  };

  const handleEditProduct = (productId: number) => {
    setEditingProductId(productId);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingProductId(null);
  };

  const handleFormSuccess = () => {
    fetchProducts();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2 }}>
      <CardContent>
        {/* Header with Add button */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Product Catalog
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage your inventory products
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={fetchProducts} disabled={loading}>
              <RefreshOutlined />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddProduct}
            >
              Add Product
            </Button>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search products by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Stock</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'No products found matching your search' : 'No products found'}
                      </Typography>
                      {!searchTerm && (
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={handleAddProduct}
                          sx={{ mt: 2 }}
                        >
                          Add Your First Product
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{
                      backgroundColor: product.is_low_stock ? 'rgba(255, 152, 0, 0.05)' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {product.name}
                      </Typography>
                      {product.supplier && (
                        <Typography variant="caption" color="text.secondary">
                          {product.supplier.name}
                        </Typography>
                      )}
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
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatPrice(product.price)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2">
                          {product.stock_quantity}
                        </Typography>
                        {product.is_low_stock && (
                          <Typography variant="caption" color="error">
                            Low stock!
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.is_low_stock ? 'Low Stock' : 'In Stock'}
                        size="small"
                        color={product.is_low_stock ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit product">
                        <IconButton
                          size="small"
                          onClick={() => handleEditProduct(product.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: '1px solid rgba(0,0,0,0.08)', mt: 2 }}
        />
      </CardContent>

      <ProductForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editProductId={editingProductId}
      />
    </Card>
  );
};

export default ProductList;
