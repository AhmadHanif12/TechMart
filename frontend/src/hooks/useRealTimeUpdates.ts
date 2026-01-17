/**
 * Custom hook for real-time updates using WebSocket.
 *
 * Manages WebSocket connection and registers event handlers.
 */

import { useEffect } from 'react';
import { webSocketService } from '../services/websocket';

export const useRealTimeUpdates = (onUpdate: () => void) => {
  useEffect(() => {
    // Connect to WebSocket if not already connected
    if (!webSocketService.connected()) {
      console.log('[RealTime] Connecting to WebSocket...');
      webSocketService.connect();
    }

    // Register handlers for real-time updates
    const unsubscribers = [];

    // Dashboard update handler
    const handleDashboardUpdate = (data: any) => {
      console.log('[RealTime] Dashboard update received', data);
      onUpdate();
    };

    // Transaction handler
    const handleNewTransaction = (data: any) => {
      console.log('[RealTime] New transaction received', data);
      onUpdate();
    };

    // Stock update handler
    const handleStockUpdate = (data: any) => {
      console.log('[RealTime] Stock update received', data);
      onUpdate();
    };

    // Alert handler
    const handleNewAlert = (data: any) => {
      console.log('[RealTime] New alert received', data);
      onUpdate();
    };

    // Metrics handler
    const handleMetricsUpdate = (data: any) => {
      console.log('[RealTime] Metrics update received', data);
      onUpdate();
    };

    // Subscribe to events
    unsubscribers.push(webSocketService.on('dashboard_update', handleDashboardUpdate));
    unsubscribers.push(webSocketService.on('new_transaction', handleNewTransaction));
    unsubscribers.push(webSocketService.on('stock_update', handleStockUpdate));
    unsubscribers.push(webSocketService.on('new_alert', handleNewAlert));
    unsubscribers.push(webSocketService.on('metrics_update', handleMetricsUpdate));

    // Cleanup function - call all unsubscribe functions
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [onUpdate]);
};
