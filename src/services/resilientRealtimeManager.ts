
// DISABLED: This manager is now disabled to prevent subscription conflicts
// All realtime functionality has been moved to stableRealtimeManager

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastError: string | null;
  disconnectReason: string | null;
}

interface RealtimeSubscription {
  id: string;
  callback: (payload: any) => void;
  filters: {
    event: string;
    schema: string;
    table: string;
  };
}

class ResilientRealtimeManager {
  private isDisabled = true;
  private connectionState: ConnectionState = {
    isConnected: false,
    status: 'offline',
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    connectionQuality: 'poor',
    lastError: 'Manager disabled',
    disconnectReason: 'Disabled to prevent conflicts'
  };

  constructor() {
    console.log('🔄 [RESILIENT REALTIME] This manager is disabled - using stableRealtimeManager instead');
  }

  subscribe(subscription: RealtimeSubscription): () => void {
    console.log('🔄 [RESILIENT REALTIME] Subscription disabled - using stableRealtimeManager instead');
    return () => {};
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  addConnectionListener(callback: (state: ConnectionState) => void): () => void {
    console.log('🔄 [RESILIENT REALTIME] Connection listener disabled');
    return () => {};
  }

  forceReconnect(): void {
    console.log('🔄 [RESILIENT REALTIME] Reconnect disabled');
  }

  getHealthStatus() {
    return {
      isHealthy: false,
      status: 'disabled',
      message: 'Manager disabled to prevent conflicts'
    };
  }
}

export const resilientRealtimeManager = new ResilientRealtimeManager();
