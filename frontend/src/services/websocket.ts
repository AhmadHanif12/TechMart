/**
 * WebSocket Service for Real-time Updates
 *
 * Manages WebSocket connection to the backend for real-time data updates.
 */

export type WebSocketEventType =
  | 'connected'
  | 'disconnected'
  | 'new_transaction'
  | 'stock_update'
  | 'new_alert'
  | 'dashboard_update'
  | 'fraud_detected'
  | 'metrics_update'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketEventType;
  channel?: string;
  timestamp: string;
  data?: any;
}

export type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Connect to WebSocket server
   */
  connect(userId?: string, channels: string[] = ['dashboard']): void {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.warn('[WebSocket] Connection already in progress or established');
      return;
    }

    this.isConnecting = true;

    // WebSocket URL - using native WebSocket, not Socket.IO!
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

    console.log('[WebSocket] Connecting to', wsUrl);

    // Create WebSocket connection
    this.ws = new WebSocket(`${wsUrl}/api/v1/ws/dashboard?user_id=${userId || 'anonymous'}&channels=${channels.join(',')}`);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
      this.isConnecting = false;
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { socketId: 'connected' });
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      this.isConnecting = false;
      this.isConnected = false;
      this.emit('disconnected', { reason: 'Connection closed' });

      // Attempt to reconnect
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.isConnecting = false;
      this.emit('error', { error: 'WebSocket connection error' });
      this.isConnected = false;

      // Close the broken connection
      if (this.ws) {
        this.ws.close();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('[WebSocket] Message received:', message);
        this.handleServerMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('[WebSocket] Attempting reconnection...');
      this.connect();

      this.reconnectTimer = null;
    }, this.reconnectDelay);
  }

  /**
   * Handle server message
   */
  private handleServerMessage(message: WebSocketMessage): void {
    const { type, data } = message;
    this.emit(type, data);
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot subscribe: not connected');
      return;
    }

    const message = {
      action: 'subscribe',
      channel: channel
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      action: 'unsubscribe',
      channel: channel
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send message to server
   */
  send(action: string, data?: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send: not connected');
      return;
    }

    this.ws.send(JSON.stringify({ action, data }));
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.isConnecting = false;
    this.isConnected = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Register event handler
   */
  on(eventType: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Unregister event handler
   */
  off(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(eventType: WebSocketEventType, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in handler for ${eventType}:`, error);
        }
      });
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// Export as both default and named export
export default webSocketService;
export { webSocketService };
