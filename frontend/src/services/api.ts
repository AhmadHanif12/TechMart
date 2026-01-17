/**
 * API Service for TechMart Analytics Dashboard
 *
 * Axios-based HTTP client with interceptors for error handling
 * and request/response transformation.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// API base URL - use environment variable or default to backend service
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// API response wrapper type
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error: string | null;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    cached?: boolean;
    response_time_ms?: number;
  };
}

// API error type
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Create and configure Axios instance
 */
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token if available
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add timestamp for cache busting if needed
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and transform response
  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      // Return data directly from wrapped response
      return response.data;
    },
    (error: AxiosError<ApiResponse>) => {
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const apiError: ApiError = {
          message: error.response.data?.error || 'An error occurred',
          status: error.response.status,
          code: error.code,
        };
        return Promise.reject(apiError);
      } else if (error.request) {
        // Request made but no response
        const apiError: ApiError = {
          message: 'No response from server. Please check your connection.',
          code: 'NETWORK_ERROR',
        };
        return Promise.reject(apiError);
      } else {
        // Request setup error
        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          code: error.code,
        };
        return Promise.reject(apiError);
      }
    }
  );

  return instance;
};

// Create API instance
const api = createApiInstance();

/**
 * Dashboard API
 */
export const dashboardApi = {
  /**
   * Get dashboard overview metrics
   */
  getOverview: async (): Promise<ApiResponse> => {
    return api.get('/dashboard/overview');
  },

  /**
   * Get real-time dashboard metrics
   */
  getRealtimeMetrics: async (): Promise<ApiResponse> => {
    return api.get('/dashboard/metrics/realtime');
  },
};

/**
 * Transactions API
 */
export const transactionsApi = {
  /**
   * Get paginated list of transactions
   */
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    customer_id?: number;
    product_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse> => {
    return api.get('/transactions', { params });
  },

  /**
   * Get transaction by ID
   */
  getTransaction: async (id: number): Promise<ApiResponse> => {
    return api.get(`/transactions/${id}`);
  },

  /**
   * Create new transaction
   */
  createTransaction: async (data: {
    customer_id: number;
    product_id: number;
    quantity: number;
    payment_method: string;
    discount_applied?: number;
    shipping_cost?: number;
  }): Promise<ApiResponse> => {
    return api.post('/transactions', data);
  },

  /**
   * Get suspicious transactions
   */
  getSuspiciousTransactions: async (params?: {
    hours?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    return api.get('/transactions/suspicious', { params });
  },

  /**
   * Get recent transactions
   */
  getRecentTransactions: async (limit: number = 10): Promise<ApiResponse> => {
    return api.get('/transactions', { params: { limit, sort: 'timestamp:desc' } });
  },
};

/**
 * Inventory API
 */
export const inventoryApi = {
  /**
   * Get low stock products
   */
  getLowStock: async (params?: {
    urgency_threshold?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    return api.get('/inventory/low-stock', { params });
  },

  /**
   * Get demand forecast for a product
   */
  getForecast: async (productId: number, horizonDays: number = 7): Promise<ApiResponse> => {
    return api.get(`/inventory/predictions/${productId}`, {
      params: { horizon_days: horizonDays },
    });
  },

  /**
   * Get reorder suggestions
   */
  getReorderSuggestions: async (params?: {
    status?: string;
    urgency_threshold?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    return api.get('/inventory/reorder-suggestions', { params });
  },

  /**
   * Approve reorder suggestion
   */
  approveReorder: async (id: number): Promise<ApiResponse> => {
    return api.post(`/inventory/reorder-suggestions/${id}/approve`);
  },

  /**
   * Get products list
   */
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<ApiResponse> => {
    return api.get('/inventory/products', { params });
  },
};

/**
 * Analytics API
 */
export const analyticsApi = {
  /**
   * Get hourly sales data
   */
  getHourlySales: async (params: {
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse> => {
    return api.get('/analytics/hourly-sales', { params });
  },

  /**
   * Get top products
   */
  getTopProducts: async (params?: {
    limit?: number;
    period?: '7d' | '30d' | '90d';
  }): Promise<ApiResponse> => {
    return api.get('/analytics/top-products', { params });
  },

  /**
   * Get customer segments
   */
  getCustomerSegments: async (): Promise<ApiResponse> => {
    return api.get('/analytics/customer-segments');
  },

  /**
   * Get category performance
   */
  getCategoryPerformance: async (params?: {
    period?: '7d' | '30d' | '90d';
  }): Promise<ApiResponse> => {
    return api.get('/analytics/category-performance', { params });
  },
};

/**
 * Alerts API
 */
export const alertsApi = {
  /**
   * Get alerts list
   */
  getAlerts: async (params?: {
    is_resolved?: boolean;
    severity?: string;
    alert_type?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    return api.get('/alerts', { params });
  },

  /**
   * Create new alert
   */
  createAlert: async (data: {
    alert_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    entity_type?: string;
    entity_id?: number;
  }): Promise<ApiResponse> => {
    return api.post('/alerts', data);
  },

  /**
   * Resolve alert
   */
  resolveAlert: async (id: number): Promise<ApiResponse> => {
    return api.patch(`/alerts/${id}/resolve`);
  },

  /**
   * Delete alert
   */
  deleteAlert: async (id: number): Promise<ApiResponse> => {
    return api.delete(`/alerts/${id}`);
  },
};

/**
 * Export API
 */
export const exportApi = {
  /**
   * Export data to CSV
   */
  exportToCSV: async (type: 'transactions' | 'products' | 'customers', params?: any): Promise<Blob> => {
    const response = await api.get(`/export/${type}/csv`, {
      params,
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Export dashboard to PDF
   */
  exportDashboardToPDF: async (): Promise<Blob> => {
    const response = await api.get('/export/dashboard/pdf', {
      responseType: 'blob',
    });
    return response;
  },
};

export default api;
