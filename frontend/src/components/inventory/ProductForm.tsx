/**
 * Product Form Component
 *
 * Form for creating and editing products.
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
  Edit as EditIcon,
} from '@mui/icons-material';

interface Supplier {
  id: number;
  name: string;
}

interface ProductFormData {
  name: string;
  category: string;
  price: string;
  stock_quantity: string;
  supplier_id: string;
  sku: string;
  description: string;
  weight: string;
  dimensions: string;
  warranty_months: string;
  reorder_threshold: string;
  reorder_quantity: string;
}

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editProductId?: number | null;
}

const ProductForm: React.FC<ProductFormProps> = ({
  open,
  onClose,
  onSuccess,
  editProductId
}) => {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    price: '',
    stock_quantity: '0',
    supplier_id: '',
    sku: '',
    description: '',
    weight: '',
    dimensions: '',
    warranty_months: '',
    reorder_threshold: '10',
    reorder_quantity: '50',
  });

  const categories = [
    'Electronics',
    'Computers',
    'Accessories',
    'Audio',
    'Mobile',
    'Gaming',
    'Office',
    'Other'
  ];

  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  const fetchSuppliers = async () => {
    try {
      // For now, add some mock suppliers
      setSuppliers([
        { id: 1, name: 'TechSupply Co.' },
        { id: 2, name: 'Global Parts Inc.' },
        { id: 3, name: 'Electronics Warehouse' },
      ]);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSelectChange = (name: string) => (e: any) => {
    setFormData(prev => ({ ...prev, [name]: e.target.value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Product name is required');
      return false;
    }
    if (!formData.category) {
      setError('Category is required');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return false;
    }
    if (!formData.sku.trim()) {
      setError('SKU is required');
      return false;
    }
    if (!formData.supplier_id) {
      setError('Supplier is required');
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
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        supplier_id: parseInt(formData.supplier_id),
        sku: formData.sku,
        description: formData.description || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions || undefined,
        warranty_months: formData.warranty_months ? parseInt(formData.warranty_months) : undefined,
        reorder_threshold: parseInt(formData.reorder_threshold) || 10,
        reorder_quantity: parseInt(formData.reorder_quantity) || 50,
      };

      const url = editProductId
        ? `http://localhost:8000/api/v1/inventory/${editProductId}`
        : 'http://localhost:8000/api/v1/inventory/';

      const method = editProductId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to save product');
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        category: '',
        price: '',
        stock_quantity: '0',
        supplier_id: '',
        sku: '',
        description: '',
        weight: '',
        dimensions: '',
        warranty_months: '',
        reorder_threshold: '10',
        reorder_quantity: '50',
      });
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editProductId ? <EditIcon /> : <AddIcon />}
          <Typography variant="h6">
            {editProductId ? 'Edit Product' : 'Add New Product'}
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
              Product {editProductId ? 'updated' : 'created'} successfully!
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Product Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={loading}
                autoFocus={!editProductId}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={handleSelectChange('category')}
                  label="Category"
                  disabled={loading}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="sku"
                label="SKU"
                value={formData.sku}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={loading}
                placeholder="e.g., PROD-001"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="price"
                label="Price ($)"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={loading}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Inventory Settings */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
                Inventory Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                name="stock_quantity"
                label="Initial Stock"
                type="number"
                value={formData.stock_quantity}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                name="reorder_threshold"
                label="Reorder Threshold"
                type="number"
                value={formData.reorder_threshold}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                inputProps={{ min: 0 }}
                helperText="Alert when stock below this"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                name="reorder_quantity"
                label="Reorder Quantity"
                type="number"
                value={formData.reorder_quantity}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                inputProps={{ min: 1 }}
                helperText="Default qty to reorder"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Additional Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
                Additional Details
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={formData.supplier_id}
                  onChange={handleSelectChange('supplier_id')}
                  label="Supplier"
                  disabled={loading}
                >
                  {suppliers.map(supplier => (
                    <MenuItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                name="weight"
                label="Weight (kg)"
                type="number"
                value={formData.weight}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                name="warranty_months"
                label="Warranty (months)"
                type="number"
                value={formData.warranty_months}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="dimensions"
                label="Dimensions (LxWxH)"
                value={formData.dimensions}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
                placeholder="e.g., 10x5x3 cm"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || success}
            startIcon={loading ? <CircularProgress size={16} /> : (editProductId ? <EditIcon /> : <AddIcon />)}
          >
            {loading ? 'Saving...' : success ? 'Saved!' : (editProductId ? 'Update Product' : 'Add Product')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductForm;
