/**
 * Reorder Suggestions Component
 *
 * Displays automated reorder suggestions with urgency scores.
 * Part of Challenge B: Advanced Inventory Management.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
  IconButton,
  Button,
  LinearProgress,
  Divider,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  InventoryOutlined,
  TrendingUpOutlined,
  LocalShippingOutlined,
  CheckCircleOutlined,
  RefreshOutlined,
} from '@mui/icons-material';
import { inventoryApi } from '../../services/api';

export interface ReorderSuggestion {
  id: number;
  product: {
    id: number;
    name: string;
    sku: string;
    current_stock: number;
  };
  suggested_quantity: number;
  suggested_supplier: {
    id: number;
    name: string;
    reliability_score: number;
    average_delivery_days: number;
  } | null;
  urgency_score: number;
  estimated_stockout_date: string | null;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'ordered';
  created_at: string;
}

const ReorderSuggestions: React.FC = () => {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getReorderSuggestions({ limit: 20, status: 'pending' });
      if (response.success && response.data) {
        setSuggestions(response.data.suggestions || response.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching reorder suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (suggestionId: number) => {
    setProcessing(suggestionId);
    try {
      await inventoryApi.approveReorder(suggestionId);
      // Refresh the list
      fetchSuggestions();
    } catch (error: any) {
      console.error('Error approving reorder:', error);
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const getUrgencyColor = (score: number): 'error' | 'warning' | 'info' | 'default' => {
    if (score >= 0.8) return 'error';
    if (score >= 0.6) return 'warning';
    if (score >= 0.4) return 'info';
    return 'default';
  };

  const getUrgencyLabel = (score: number): string => {
    if (score >= 0.8) return 'Critical';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
              <TrendingUpOutlined color="primary" fontSize="small" />
              Reorder Suggestions
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              AI-powered reorder recommendations
            </Typography>
          </Box>
          <Tooltip title="Refresh suggestions">
            <span>
              <IconButton onClick={fetchSuggestions} disabled={loading} size="small">
                <RefreshOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {loading ? (
          <Box sx={{ py: 2 }}>
            <LinearProgress />
          </Box>
        ) : suggestions.length === 0 ? (
          <Alert severity="success" icon={<CheckCircleOutlined />} sx={{ mt: 1 }}>
            No pending reorder suggestions. All products are well-stocked!
          </Alert>
        ) : (
          <List sx={{ flexGrow: 1, overflow: 'auto', py: 0, maxHeight: { xs: 400, lg: 500 } }}>
            {suggestions.map((suggestion, index) => (
              <React.Fragment key={suggestion.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.02)',
                    borderRadius: 2,
                    mb: 1,
                    py: 1,
                    px: 1.5,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: getUrgencyColor(suggestion.urgency_score) === 'error' ? 'error.main' :
                                     getUrgencyColor(suggestion.urgency_score) === 'warning' ? 'warning.main' :
                                     getUrgencyColor(suggestion.urgency_score) === 'info' ? 'info.main' : 'grey.500' }}>
                        <InventoryOutlined sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {suggestion.product.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={getUrgencyLabel(suggestion.urgency_score)}
                      size="small"
                      color={getUrgencyColor(suggestion.urgency_score)}
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>

                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalShippingOutlined sx={{ fontSize: 14 }} color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {suggestion.suggested_supplier?.name || 'Unknown'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Qty: <strong>{suggestion.suggested_quantity}</strong>
                      </Typography>
                    </Box>

                    {suggestion.estimated_stockout_date && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.5 }}>
                        ⚠️ Stockout: {formatDate(suggestion.estimated_stockout_date)}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', flex: 1, pr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{suggestion.reasoning}"
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CheckCircleOutlined />}
                        onClick={() => handleApprove(suggestion.id)}
                        disabled={processing === suggestion.id}
                        sx={{ minWidth: 'auto', fontSize: '0.75rem', py: 0.5, px: 1 }}
                      >
                        {processing === suggestion.id ? '...' : 'Approve'}
                      </Button>
                    </Box>
                  </Box>
                </ListItem>
                {index < suggestions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default ReorderSuggestions;
