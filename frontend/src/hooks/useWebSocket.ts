/**
 * useWebSocket Hook
 *
 * React hook for managing WebSocket connections and handling real-time updates.
 */

import { useEffect, useCallback, useRef } from 'react';
import webSocketService, {
  WebSocketEventType,
  WebSocketEventHandler,
} from '../services/websocket';

export interface UseWebSocketOptions {
  /**
   * Auto-connect on mount
   */
  autoConnect?: boolean;

  /**
   * User ID for authentication
   */
  userId?: string;

  /**
   * Channels to subscribe to
   */
  channels?: string[];

  /**
   * Event handlers
   */
  onConnected?: (data: any) => void;
  onDisconnected?: (data: any) => void;
  onError?: (data: any) => void;
  onNewTransaction?: (data: any) => void;
  onStockUpdate?: (data: any) => void;
  onNewAlert?: (data: any) => void;
  onDashboardUpdate?: (data: any) => void;
  onMetricsUpdate?: (data: any) => void;
  onFraudDetected?: (data: any) => void;
}

export interface UseWebSocketReturn {
  /**
   * Current connection status
   */
  connected: boolean;

  /**
   * Connect to WebSocket server
   */
  connect: () => void;

  /**
   * Disconnect from WebSocket server
   */
  disconnect: () => void;

  /**
   * Subscribe to a channel
   */
  subscribe: (channel: string) => void;

  /**
   * Unsubscribe from a channel
   */
  unsubscribe: (channel: string) => void;

  /**
   * Send message to server
   */
  send: (action: string, data?: any) => void;
}

/**
 * Hook for WebSocket functionality
 */
export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = true,
    userId,
    channels = ['dashboard'],
    onConnected,
    onDisconnected,
    onError,
    onNewTransaction,
    onStockUpdate,
    onNewAlert,
    onDashboardUpdate,
    onMetricsUpdate,
    onFraudDetected,
  } = options;

  // Track cleanup functions
  const cleanupRef = useRef<(() => void)[]>([]);

  // Use refs to store callbacks so they don't cause re-runs
  const callbacksRef = useRef({
    onConnected,
    onDisconnected,
    onError,
    onNewTransaction,
    onStockUpdate,
    onNewAlert,
    onDashboardUpdate,
    onMetricsUpdate,
    onFraudDetected,
  });

  // Update refs when callbacks change (this doesn't disconnect the socket)
  useEffect(() => {
    callbacksRef.current = {
      onConnected,
      onDisconnected,
      onError,
      onNewTransaction,
      onStockUpdate,
      onNewAlert,
      onDashboardUpdate,
      onMetricsUpdate,
      onFraudDetected,
    };
  }, [
    onConnected,
    onDisconnected,
    onError,
    onNewTransaction,
    onStockUpdate,
    onNewAlert,
    onDashboardUpdate,
    onMetricsUpdate,
    onFraudDetected,
  ]);

  // Connect function
  const connect = useCallback(() => {
    webSocketService.connect(userId, channels);
  }, [userId, channels]);

  // Disconnect function
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Subscribe function
  const subscribe = useCallback((channel: string) => {
    webSocketService.subscribe(channel);
  }, []);

  // Unsubscribe function
  const unsubscribe = useCallback((channel: string) => {
    webSocketService.unsubscribe(channel);
  }, []);

  // Send function
  const send = useCallback((action: string, data?: any) => {
    webSocketService.send(action, data);
  }, []);

  // Setup WebSocket connection (runs once on mount)
  useEffect(() => {
    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      // Disconnect if auto-connected
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  // Register event handlers (runs when callbacks change)
  useEffect(() => {
    const cleanup: (() => void)[] = [];
    const callbacks = callbacksRef.current;

    // Register event handlers using refs
    if (callbacks.onConnected) {
      cleanup.push(webSocketService.on('connected', callbacks.onConnected));
    }

    if (callbacks.onDisconnected) {
      cleanup.push(webSocketService.on('disconnected', callbacks.onDisconnected));
    }

    if (callbacks.onError) {
      cleanup.push(webSocketService.on('error', callbacks.onError));
    }

    if (callbacks.onNewTransaction) {
      cleanup.push(webSocketService.on('new_transaction', callbacks.onNewTransaction));
    }

    if (callbacks.onStockUpdate) {
      cleanup.push(webSocketService.on('stock_update', callbacks.onStockUpdate));
    }

    if (callbacks.onNewAlert) {
      cleanup.push(webSocketService.on('new_alert', callbacks.onNewAlert));
    }

    if (callbacks.onDashboardUpdate) {
      cleanup.push(webSocketService.on('dashboard_update', callbacks.onDashboardUpdate));
    }

    if (callbacks.onMetricsUpdate) {
      cleanup.push(webSocketService.on('metrics_update', callbacks.onMetricsUpdate));
    }

    if (callbacks.onFraudDetected) {
      cleanup.push(webSocketService.on('fraud_detected', callbacks.onFraudDetected));
    }

    // Cleanup function - unregister old handlers
    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [
    onConnected,
    onDisconnected,
    onError,
    onNewTransaction,
    onStockUpdate,
    onNewAlert,
    onDashboardUpdate,
    onMetricsUpdate,
    onFraudDetected,
  ]);

  return {
    connected: webSocketService.connected(),
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
  };
};

export default useWebSocket;
