/**
 * Main Layout Component
 *
 * Combines Header, Sidebar, and content area for the application.
 * Supports responsive mobile sidebar.
 */

import React, { useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import { useDashboardStore } from '../../store/dashboardStore';

const Layout: React.FC = () => {
  const { fetchMetrics, autoRefreshEnabled } = useDashboardStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch metrics on mount
  useEffect(() => {
    if (autoRefreshEnabled) {
      fetchMetrics();
    }
  }, [fetchMetrics, autoRefreshEnabled]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header - Fixed Position, Full Width */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200 }}>
        <Header onMobileMenuClick={handleDrawerToggle} />
      </Box>

      {/* Main Layout with Sidebar and Content */}
      <Box sx={{ display: 'flex', flex: 1, marginTop: '64px' }}>
        {/* Sidebar */}
        <Sidebar
          width={DRAWER_WIDTH}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            marginLeft: { xs: 0, sm: `${DRAWER_WIDTH}px` },
            px: { xs: 2, sm: 3 },
            py: 3,
            minHeight: 'calc(100vh - 64px)',
            backgroundColor: '#f8f9fa',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
