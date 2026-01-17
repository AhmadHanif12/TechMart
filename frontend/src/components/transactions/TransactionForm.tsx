/**
 * Transaction Form Component
 *
 * Form for creating new transactions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';

interface Product {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
}

interface Customer {
  id: number;
  email?: string;
  name?: string;
}

interface TransactionFormData {
  customer_id: string;
  product_id: string;
  quantity: string;
  payment_method: string;
  discount_applied: string;
  shipping_cost: string;
}

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<TransactionFormData>({
    customer_id: '',
    product_id: '',
    quantity: '1',
    payment_method: 'credit_card',
    discount_applied: '0',
    shipping_cost: '0',
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);

  const paymentMethods = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
  ];

  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchCustomers();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProduct) {
      const qty = parseInt(formData.quantity) || 0;
      const discount = parseFloat(formData.discount_applied) || 0;
      const shipping = parseFloat(formData.shipping_cost) || 0;
      const subtotal = selectedProduct.price * qty;
      setTotalAmount(Math.max(0, subtotal - discount + shipping));
    }
  }, [selectedProduct, formData.quantity, formData.discount_applied, formData.shipping_cost]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/inventory/products?limit=100');
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        setProducts(data.data);
        if (data.data.length === 0) {
          console.warn('No products available');
        }
      } else {
        console.error('Failed to fetch products:', data.error || 'Unknown error');
        // Optionally show an error to the user
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      // For now, add some mock customers
      setCustomers([
        { id: 1, email: 'john@example.com', name: 'John Doe' },
        { id: 2, email: 'jane@example.com', name: 'Jane Smith' },
        { id: 3, email: 'bob@example.com', name: 'Bob Wilson' },
      ]);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSelectChange = (name: string) => (e: any) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);

    if (name === 'product_id') {
      const product = products.find(p => p.id === parseInt(value));
      setSelectedProduct(product || null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.customer_id) {
      setError('Customer is required');
      return false;
    }
    if (!formData.product_id) {
      setError('Product is required');
      return false;
    }
    const qty = parseInt(formData.quantity);
    if (!qty || qty <= 0) {
      setError('Quantity must be greater than 0');
      return false;
    }
    if (selectedProduct && qty > selectedProduct.stock_quantity) {
      setError(`Insufficient stock. Only ${selectedProduct.stock_quantity} available.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        customer_id: parseInt(formData.customer_id),
        product_id: parseInt(formData.product_id),
        quantity: parseInt(formData.quantity),
        payment_method: formData.payment_method,
        discount_applied: parseFloat(formData.discount_applied) || 0,
        shipping_cost: parseFloat(formData.shipping_cost) || 0,
        ip_address: '127.0.0.1',
      };

      const response = await fetch('http://localhost:8000/api/v1/transactions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to create transaction');
      }
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      setError(err.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        customer_id: '',
        product_id: '',
        quantity: '1',
        payment_method: 'credit_card',
        discount_applied: '0',
        shipping_cost: '0',
      });
      setSelectedProduct(null);
      setError(null);
      setSuccess(false);
      setTotalAmount(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartIcon />
          <Typography variant="h6">
            Create Transaction
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Transaction created successfully!
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Customer Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={formData.customer_id}
                  onChange={handleSelectChange('customer_id')}
                  label="Customer"
                  disabled={loading}
                >
                  {customers.map(customer => (
                    <MenuItem key={customer.id} value={customer.id.toString()}>
                      {customer.name || customer.email || `Customer #${customer.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Product Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Product</InputLabel>
                <Select
                  value={formData.product_id}
                  onChange={handleSelectChange('product_id')}
                  label="Product"
                  disabled={loading || loadingProducts}
                >
                  {loadingProducts ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Loading products...
                    </MenuItem>
                  ) : products.length === 0 ? (
                    <MenuItem disabled>
                      No products available - Please add products first
                    </MenuItem>
                  ) : (
                    products.map(product => (
                      <MenuItem
                        key={product.id}
                        value={product.id.toString()}
                        disabled={product.stock_quantity === 0}
                      >
                        {product.name} - ${product.price.toFixed(2)}
                        {product.stock_quantity === 0 && ' (Out of Stock)'}
                        {product.stock_quantity > 0 && product.stock_quantity < 10 && ` (Only ${product.stock_quantity} left)`}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              {!loadingProducts && products.length === 0 && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                  ⚠️ No products found. Go to the Products page to add products first.
                </Typography>
              )}
            </Grid>

            {selectedProduct && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="caption">
                    <strong>{selectedProduct.name}</strong><br />
                    Price: ${selectedProduct.price.toFixed(2)} each | Stock: {selectedProduct.stock_quantity}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Quantity */}
            <Grid item xs={6}>
              <TextField
                name="quantity"
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={loading}
                inputProps={{ min: 1, max: selectedProduct?.stock_quantity || 999 }}
              />
            </Grid>

            {/* Payment Method */}
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Payment</InputLabel>
                <Select
                  value={formData.payment_method}
                  onChange={handleSelectChange('payment_method')}
                  label="Payment"
                  disabled={loading}
                >
                  {paymentMethods.map(method => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Discount */}
            <Grid item xs={6}>
              <TextField
                name="discount_applied"
                label="Discount ($)"
                type="number"
                value={formData.discount_applied}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Shipping Cost */}
            <Grid item xs={6}>
              <TextField
                name="shipping_cost"
                label="Shipping ($)"
                type="number"
                value={formData.shipping_cost}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Total */}
            {selectedProduct && (
              <Grid item xs={12}>
                <Box sx={{
                  p: 2,
                  bgcolor: 'primary.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'primary.main'
                }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                    ${totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || success || !selectedProduct}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {loading ? 'Creating...' : success ? 'Created!' : 'Create Transaction'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TransactionForm;
