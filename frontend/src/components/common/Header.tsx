/**
 * Header Component
 *
 * Top navigation bar with logo, metrics summary, and user menu.
 */

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  AccountCircleOutlined,
  RefreshOutlined,
  Menu as MenuIcon,
  PersonOutlined,
  LogoutOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../../store/dashboardStore';

export interface HeaderProps {
  onMobileMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuClick }) => {
  const navigate = useNavigate();
  const { metrics, refreshMetrics, isRefreshing } = useDashboardStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = () => {
    refreshMetrics();
  };

  // Auto-refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMetrics();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Mobile Menu Button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={onMobileMenuClick}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mr: 4,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              background: 'linear-gradient(135deg, #1976d2 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5,
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
              T
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '1.25rem' }}>
            TechMart
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
            Analytics
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Quick Metrics - Desktop */}
        {metrics && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5, mr: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.2 }}>
                Sales (24h)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'success.main' }}>
                ${metrics.sales_24h?.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.2 }}>
                Transactions
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {metrics.transactions_24h?.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.2 }}>
                Low Stock
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: metrics.low_stock_count > 0 ? 'warning.main' : 'success.main' }}>
                {metrics.low_stock_count?.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.2 }}>
                Alerts
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {metrics.active_alerts?.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Refresh data">
            <IconButton size="small" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshOutlined sx={{ fontSize: '1.25rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Account">
            <IconButton size="small" onClick={handleMenuOpen}>
              <AccountCircleOutlined sx={{ fontSize: '1.5rem' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* User Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            '& .MuiPaper-root': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              borderRadius: 2,
              minWidth: 220,
            },
          }}
        >
          {/* Account Info Header */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Demo Account
            </Typography>
            <Typography variant="caption" color="text.secondary">
              demo@techmart.com
            </Typography>
          </Box>

          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate('/profile');
            }}
            sx={{ py: 1.5, px: 2 }}
          >
            <ListItemIcon>
              <PersonOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile Settings</ListItemText>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate('/logout');
            }}
            sx={{ py: 1.5, px: 2, color: 'error.main' }}
          >
            <ListItemIcon>
              <LogoutOutlined fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
