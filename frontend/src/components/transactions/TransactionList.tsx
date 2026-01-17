/**
 * Transaction List Component
 *
 * Displays a list of transactions with filtering and pagination.
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
  Menu,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  RefreshOutlined,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import TransactionForm from './TransactionForm';

interface TransactionDetail {
  id: number;
  customer_id: number;
  customer_email?: string;
  product_id?: number;
  product_name?: string;
  quantity: number;
  total_amount: number;
  status: string;
  timestamp: string;
  is_suspicious: boolean;
  fraud_score: number;
  fraud_reason?: string;
  payment_method?: string;
}

interface Transaction {
  id: number;
  customer_id: number;
  customer_email?: string;
  product_id?: number;
  product_name?: string;
  quantity: number;
  total_amount: number;
  status: string;
  timestamp: string;
  is_suspicious: boolean;
  fraud_score: number;
}

const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'suspicious'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [page, rowsPerPage, filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const skip = page * rowsPerPage;
      const endpoint = filter === 'suspicious'
        ? `http://localhost:8000/api/v1/transactions/suspicious?skip=${skip}&limit=${rowsPerPage}`
        : `http://localhost:8000/api/v1/transactions?skip=${skip}&limit=${rowsPerPage}&hours=168`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success && data.data) {
        const txnData = Array.isArray(data.data) ? data.data : data.data.transactions || [];
        setTransactions(txnData);

        // Estimate total count (in production, API should return total count)
        setTotalCount(data.metadata?.total || txnData.length + skip + (txnData.length === rowsPerPage ? rowsPerPage : 0));
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
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

  const handleFilterChange = (event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'suspicious' | null) => {
    if (newFilter !== null) {
      setFilter(newFilter);
      setPage(0);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transactionId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransactionId(transactionId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransactionId(null);
  };

  const handleMenuAction = async (action: string) => {
    if (selectedTransactionId) {
      if (action === 'view') {
        await fetchTransactionDetail(selectedTransactionId);
      } else if (action === 'flag_suspicious') {
        console.log(`Flagging transaction ${selectedTransactionId} as suspicious`);
        // Implement flag logic if needed
      }
    }
    handleMenuClose();
  };

  const fetchTransactionDetail = async (transactionId: number) => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/transactions/${transactionId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setSelectedTransaction(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedTransaction(null);
  };

  const handleFormClose = () => {
    setFormOpen(false);
  };

  const handleFormSuccess = () => {
    fetchTransactions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2 }}>
      <CardContent>
        {/* Header with Filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Transaction History
            </Typography>
            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={handleFilterChange}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  px: 2,
                  py: 0.5,
                  fontSize: '0.875rem',
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
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="suspicious">Suspicious Only</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton size="small" onClick={fetchTransactions} disabled={loading}>
              <RefreshOutlined />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
              size="small"
            >
              New Transaction
            </Button>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography color="text.secondary">No transactions found</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    hover
                    sx={{
                      backgroundColor: transaction.is_suspicious ? 'rgba(255, 152, 0, 0.08)' : 'inherit',
                      '&:hover': {
                        backgroundColor: transaction.is_suspicious
                          ? 'rgba(255, 152, 0, 0.12)'
                          : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        #{transaction.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {transaction.customer_email || `Customer #${transaction.customer_id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {transaction.product_name || `Product #${transaction.product_id || 'N/A'}`}
                        </Typography>
                        {transaction.is_suspicious && (
                          <WarningIcon
                            color="error"
                            sx={{ fontSize: 18 }}
                            titleAccess={`Fraud score: ${(transaction.fraud_score * 100).toFixed(0)}%`}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {transaction.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatAmount(transaction.total_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(transaction.status)}
                        label={transaction.status}
                        size="small"
                        color={getStatusColor(transaction.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(transaction.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, transaction.id)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
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

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleMenuAction('view')}>
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('flag_suspicious')}>
            <FlagIcon fontSize="small" sx={{ mr: 1 }} />
            Flag Suspicious
          </MenuItem>
        </Menu>

        {/* Transaction Detail Dialog */}
        <Dialog open={detailOpen} onClose={handleDetailClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VisibilityIcon />
              Transaction Details
            </Box>
          </DialogTitle>

          <DialogContent>
            {loadingDetail ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : selectedTransaction ? (
              <Box>
                {/* Status Badge */}
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={selectedTransaction.status.toUpperCase()}
                    color={getStatusColor(selectedTransaction.status) as any}
                    sx={{ fontWeight: 600 }}
                  />
                  {selectedTransaction.is_suspicious && (
                    <Chip
                      icon={<WarningIcon sx={{ fontSize: 14 }} />}
                      label="SUSPICIOUS"
                      color="error"
                      sx={{ ml: 1, fontWeight: 600 }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Transaction ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      #{selectedTransaction.id}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Date & Time
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(selectedTransaction.timestamp)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Customer
                    </Typography>
                    <Typography variant="body2">
                      {selectedTransaction.customer_email || `Customer #${selectedTransaction.customer_id}`}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Payment Method
                    </Typography>
                    <Typography variant="body2">
                      {selectedTransaction.payment_method || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Product
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedTransaction.product_name || `Product #${selectedTransaction.product_id || 'N/A'}`}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Quantity
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedTransaction.quantity}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {formatAmount(selectedTransaction.total_amount)}
                    </Typography>
                  </Grid>
                </Grid>

                {selectedTransaction.is_suspicious && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ bgcolor: 'rgba(244, 67, 54, 0.08)', p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="error" sx={{ fontWeight: 600, mb: 1 }}>
                        <WarningIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        Fraud Detection Alert
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fraud Score: {(selectedTransaction.fraud_score * 100).toFixed(1)}%
                      </Typography>
                      {selectedTransaction.fraud_reason && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Reason: {selectedTransaction.fraud_reason}
                        </Typography>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            ) : (
              <Typography color="error">Failed to load transaction details</Typography>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleDetailClose}>Close</Button>
          </DialogActions>
        </Dialog>

        <TransactionForm
          open={formOpen}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      </CardContent>
    </Card>
  );
};

export default TransactionList;
