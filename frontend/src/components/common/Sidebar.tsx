/**
 * Sidebar Component
 *
 * Clean, responsive navigation sidebar with menu items.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  ListItemButton,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  InventoryOutlined,
  CategoryOutlined,
  AnalyticsOutlined,
  WarningOutlined,
} from '@mui/icons-material';

export interface SidebarProps {
  width?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const DRAWER_WIDTH = 240;

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
    path: '/',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: <ShoppingCartOutlined />,
    path: '/transactions',
  },
  {
    id: 'products',
    label: 'Products',
    icon: <CategoryOutlined />,
    path: '/products',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: <InventoryOutlined />,
    path: '/inventory',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <AnalyticsOutlined />,
    path: '/analytics',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: <WarningOutlined />,
    path: '/alerts',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ width = DRAWER_WIDTH, mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const drawer = (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onMobileClose}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        width: DRAWER_WIDTH,
        '& .MuiDrawer-paper': {
          borderRight: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        },
        display: { xs: 'block', sm: 'none' },
      }}
    >
      <List sx={{ px: 2, pt: 2 }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  px: 2,
                  py: 1,
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: isActive ? 600 : 500,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );

  // Desktop drawer
  const desktopDrawer = (
    <Box
      sx={{
        width: width,
        flexShrink: 0,
        display: { xs: 'none', sm: 'block' },
        borderRight: '1px solid rgba(0,0,0,0.08)',
        backgroundColor: 'white',
        position: 'fixed',
        top: 64,
        left: 0,
        bottom: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 3 }}>
        {/* Navigation Items */}
        <List sx={{ flex: 1, px: 2 }}>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <ListItem key={item.id} disablePadding sx={{ py: 0.75 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: isActive ? 'rgba(25, 118, 210, 0.12)' : 'transparent',
                    color: isActive ? 'primary.main' : 'text.primary',
                    px: 2.5,
                    py: 1.75,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(25, 118, 210, 0.16)' : 'rgba(25, 118, 210, 0.06)',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiTypography-root': {
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.95rem',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      {desktopDrawer}
      {drawer}
    </>
  );
};

export default Sidebar;
export { DRAWER_WIDTH };
