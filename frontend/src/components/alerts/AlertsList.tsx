/**
 * Alerts List Component
 *
 * Displays system alerts and notifications with filtering and pagination.
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
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  Button,
  Tooltip,
} from '@mui/material';
import {
  WarningOutlined,
  ErrorOutlined,
  InfoOutlined,
  CheckCircleOutlined,
  RefreshOutlined,
  CloseOutlined,
} from '@mui/icons-material';

interface Alert {
  id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

const AlertsList: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    fetchAlerts();
  }, [page, rowsPerPage, filter, severityFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const skip = page * rowsPerPage;
      let endpoint = `http://localhost:8000/api/v1/alerts?skip=${skip}&limit=${rowsPerPage}`;

      if (filter === 'unresolved') {
        endpoint += '&is_resolved=false';
      }
      if (severityFilter !== 'all') {
        endpoint += `&severity=${severityFilter}`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success && data.data) {
        const alertsData = Array.isArray(data.data) ? data.data : [];
        setAlerts(alertsData);

        // Estimate total count
        setTotalCount(
          data.metadata?.total ||
          alertsData.length + skip + (alertsData.length === rowsPerPage ? rowsPerPage : 0)
        );
      } else {
        setAlerts([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/alerts/${alertId}/resolve`,
        {
          method: 'PATCH',
        }
      );

      const data = await response.json();

      if (data.success) {
        // Refresh alerts after resolving
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'unresolved' | null
  ) => {
    if (newFilter !== null) {
      setFilter(newFilter);
      setPage(0);
    }
  };

  const handleSeverityFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newSeverity: string | null
  ) => {
    if (newSeverity !== null) {
      setSeverityFilter(newSeverity);
      setPage(0);
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorOutlined sx={{ fontSize: 18 }} />;
      case 'high':
        return <WarningOutlined sx={{ fontSize: 18 }} />;
      case 'medium':
        return <InfoOutlined sx={{ fontSize: 18 }} />;
      default:
        return <CheckCircleOutlined sx={{ fontSize: 18 }} />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2 }}>
      <CardContent>
        {/* Header with Filters */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              System Alerts
            </Typography>
            <IconButton size="small" onClick={fetchAlerts} disabled={loading}>
              <RefreshOutlined />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Status Filter */}
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
              <ToggleButton value="all">All Alerts</ToggleButton>
              <ToggleButton value="unresolved">Unresolved</ToggleButton>
            </ToggleButtonGroup>

            {/* Severity Filter */}
            <ToggleButtonGroup
              value={severityFilter}
              exclusive
              onChange={handleSeverityFilterChange}
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
              <ToggleButton value="all">All Severity</ToggleButton>
              <ToggleButton value="critical">Critical</ToggleButton>
              <ToggleButton value="high">High</ToggleButton>
              <ToggleButton value="medium">Medium</ToggleButton>
              <ToggleButton value="low">Low</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <CheckCircleOutlined
                        sx={{ fontSize: 48, color: 'success.main', mb: 1 }}
                      />
                      <Typography color="text.secondary">No alerts found</Typography>
                      <Typography variant="caption" color="text.secondary">
                        All systems operational
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    hover
                    sx={{
                      backgroundColor: !alert.is_resolved
                        ? alert.severity === 'critical'
                          ? 'rgba(244, 67, 54, 0.05)'
                          : alert.severity === 'high'
                          ? 'rgba(255, 152, 0, 0.05)'
                          : 'inherit'
                        : 'rgba(0, 0, 0, 0.02)',
                      opacity: alert.is_resolved ? 0.6 : 1,
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSeverityIcon(alert.severity)}
                        <Chip
                          label={alert.severity.toUpperCase()}
                          size="small"
                          color={getSeverityColor(alert.severity)}
                          sx={{ fontWeight: 600, minWidth: 80 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getAlertTypeLabel(alert.alert_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {alert.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {alert.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {alert.is_resolved ? (
                        <Chip
                          icon={<CheckCircleOutlined sx={{ fontSize: 14 }} />}
                          label="Resolved"
                          size="small"
                          color="success"
                        />
                      ) : (
                        <Chip label="Active" size="small" color="warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(alert.created_at)}
                      </Typography>
                      {alert.resolved_at && (
                        <Typography variant="caption" color="success.main">
                          Resolved: {formatDate(alert.resolved_at)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!alert.is_resolved && (
                        <Tooltip title="Mark as resolved">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            <CloseOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
    </Card>
  );
};

export default AlertsList;
