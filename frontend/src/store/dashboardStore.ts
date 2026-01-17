/**
 * Dashboard Store - Zustand State Management
 *
 * Manages dashboard state including metrics, loading states,
 * and real-time updates via WebSocket.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dashboardApi } from '../services/api';

// Types
export interface DashboardMetrics {
  sales_24h: number;
  active_customers_24h: number;
  transactions_24h: number;
  active_alerts: number;
  low_stock_count: number;
  suspicious_transactions_24h: number;
  total_products?: number;
  total_customers?: number;
  avg_order_value_24h?: number;
}

export interface DashboardState {
  // Data
  metrics: DashboardMetrics | null;
  lastUpdated: Date | null;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Real-time connection
  isWebSocketConnected: boolean;
  autoRefreshEnabled: boolean;

  // Actions
  fetchMetrics: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  updateMetric: (key: keyof DashboardMetrics, value: number) => void;
  setMetrics: (metrics: DashboardMetrics) => void;
  setError: (error: string | null) => void;
  setWebSocketConnected: (connected: boolean) => void;
  toggleAutoRefresh: () => void;
  reset: () => void;
}

const initialState = {
  metrics: null,
  lastUpdated: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  isWebSocketConnected: false,
  autoRefreshEnabled: true,
};

/**
 * Dashboard Store
 */
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Fetch dashboard metrics from API
       */
      fetchMetrics: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await dashboardApi.getOverview();

          if (response.success && response.data) {
            set({
              metrics: response.data,
              lastUpdated: new Date(),
              isLoading: false,
              error: null,
            });
          } else {
            set({
              error: response.error || 'Failed to fetch dashboard metrics',
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || 'Failed to connect to server',
            isLoading: false,
          });
        }
      },

      /**
       * Refresh dashboard metrics (background refresh)
       */
      refreshMetrics: async () => {
        const { metrics } = get();
        console.log('[DashboardStore] refreshMetrics called, current metrics:', metrics);

        if (!metrics) {
          console.log('[DashboardStore] No metrics yet, calling fetchMetrics');
          return get().fetchMetrics();
        }

        set({ isRefreshing: true });

        try {
          console.log('[DashboardStore] Calling API...');
          const response = await dashboardApi.getOverview();
          console.log('[DashboardStore] API response:', response);

          if (response.success && response.data) {
            console.log('[DashboardStore] Updating metrics with:', response.data);
            set({
              metrics: response.data,
              lastUpdated: new Date(),
              isRefreshing: false,
            });
          } else {
            console.log('[DashboardStore] API response failed:', response.error);
            set({ isRefreshing: false });
          }
        } catch (error) {
          console.error('[DashboardStore] API error:', error);
          set({ isRefreshing: false });
        }
      },

      /**
       * Update a single metric (for real-time updates)
       */
      updateMetric: (key: keyof DashboardMetrics, value: number) => {
        const { metrics } = get();
        if (metrics) {
          set({
            metrics: {
              ...metrics,
              [key]: value,
            },
          });
        }
      },

      /**
       * Set metrics directly (for WebSocket updates)
       */
      setMetrics: (metrics: DashboardMetrics) => {
        set({
          metrics,
          lastUpdated: new Date(),
        });
      },

      /**
       * Set error state
       */
      setError: (error: string | null) => {
        set({ error });
      },

      /**
       * Set WebSocket connection status
       */
      setWebSocketConnected: (connected: boolean) => {
        set({ isWebSocketConnected: connected });
      },

      /**
       * Toggle auto-refresh
       */
      toggleAutoRefresh: () => {
        set((state) => ({ autoRefreshEnabled: !state.autoRefreshEnabled }));
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'techmart-dashboard-store',
      partialize: (state) => ({
        autoRefreshEnabled: state.autoRefreshEnabled,
      }),
    }
  )
);

export default useDashboardStore;
