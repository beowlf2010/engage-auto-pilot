
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ConnectionState {
  isConnected: boolean;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  backoffDelay: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastDisconnect: Date | null;
  disconnectReason: string | null;
}

interface RealtimeSubscription {
  id: string;
  callback: (payload: any) => void;
  filters: {
    event: string;
    schema: string;
    table: string;
    filter?: string;
  };
}

class OptimizedRealtimeManager {
  private channel: any = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    lastHeartbeat: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10, // Increased from 5 to 10
    backoffDelay: 1000,
    connectionQuality: 'excellent',
    lastDisconnect: null,
    disconnectReason: null
  };
  private subscriptions = new Map<string, RealtimeSubscription>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private statusCallbacks = new Set<(state: ConnectionState) => void>();
  private networkCheckInterval: NodeJS.Timeout | null = null;
  private disconnectCount = 0;
  private connectionStartTime = Date.now();

  // Subscribe to connection status changes
  onStatusChange(callback: (state: ConnectionState) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Subscribe to real-time updates
  subscribe(subscription: RealtimeSubscription): () => void {
    console.log('📡 [OPTIMIZED REALTIME] Adding subscription:', subscription.id);
    this.subscriptions.set(subscription.id, subscription);
    
    // Connect if not already connected
    if (!this.channel) {
      this.connect();
    }

    return () => {
      console.log('📡 [OPTIMIZED REALTIME] Removing subscription:', subscription.id);
      this.subscriptions.delete(subscription.id);
      
      // Disconnect if no more subscriptions
      if (this.subscriptions.size === 0) {
        this.disconnect();
      }
    };
  }

  // Force reconnection
  reconnect(): void {
    console.log('🔄 [OPTIMIZED REALTIME] Manual reconnection requested');
    this.connectionState.reconnectAttempts = 0; // Reset attempts for manual reconnection
    this.connectionState.backoffDelay = 1000; // Reset backoff
    this.saveConnectionState();
    this.disconnect();
    this.connect();
  }

  private connect(): void {
    if (this.channel) {
      this.disconnect();
    }

    console.log('🔌 [OPTIMIZED REALTIME] Connecting...');
    
    this.channel = supabase
      .channel(`optimized-realtime-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        this.handleMessage('conversations', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads'
      }, (payload) => {
        this.handleMessage('leads', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_message_approval_queue'
      }, (payload) => {
        this.handleMessage('ai_message_approval_queue', payload);
      })
      .subscribe((status) => {
        this.handleSubscriptionStatus(status);
      });

    this.startHeartbeat();
  }

  private disconnect(): void {
    console.log('🔌 [OPTIMIZED REALTIME] Disconnecting...');
    
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.stopHeartbeat();
    this.clearReconnectTimeout();
    
    this.connectionState.isConnected = false;
    this.notifyStatusChange();
  }

  private handleSubscriptionStatus(status: string): void {
    console.log('📡 [OPTIMIZED REALTIME] Status:', status);

    switch (status) {
      case 'SUBSCRIBED':
        this.connectionState.isConnected = true;
        this.connectionState.lastHeartbeat = new Date();
        this.connectionState.reconnectAttempts = 0;
        this.connectionState.backoffDelay = 1000;
        this.connectionState.disconnectReason = null;
        this.updateConnectionQuality();
        this.saveConnectionState();
        this.startNetworkMonitoring();
        break;
        
      case 'CHANNEL_ERROR':
        this.connectionState.isConnected = false;
        this.connectionState.lastDisconnect = new Date();
        this.connectionState.disconnectReason = 'Channel error';
        this.disconnectCount++;
        this.updateConnectionQuality();
        this.scheduleReconnect();
        break;
        
      case 'TIMED_OUT':
        this.connectionState.isConnected = false;
        this.connectionState.lastDisconnect = new Date();
        this.connectionState.disconnectReason = 'Connection timeout';
        this.disconnectCount++;
        this.updateConnectionQuality();
        this.scheduleReconnect();
        break;
        
      case 'CLOSED':
        this.connectionState.isConnected = false;
        this.connectionState.lastDisconnect = new Date();
        this.connectionState.disconnectReason = 'Connection closed';
        this.disconnectCount++;
        this.updateConnectionQuality();
        this.scheduleReconnect();
        break;
    }

    this.notifyStatusChange();
  }

  private handleMessage(table: string, payload: any): void {
    // Distribute message to relevant subscriptions
    this.subscriptions.forEach((subscription) => {
      if (subscription.filters.table === table) {
        try {
          subscription.callback(payload);
        } catch (error) {
          console.error('❌ [OPTIMIZED REALTIME] Callback error:', error);
        }
      }
    });

    // Update heartbeat
    this.connectionState.lastHeartbeat = new Date();
  }

  private scheduleReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      console.warn('⚠️ [OPTIMIZED REALTIME] Max reconnection attempts reached, switching to fallback mode');
      this.connectionState.connectionQuality = 'critical';
      this.saveConnectionState();
      
      // Show user-friendly message with specific guidance
      const errorMessage = this.getReconnectionGuidance();
      toast({
        title: "Connection Issues Detected",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    this.clearReconnectTimeout();

    // Enhanced backoff with jitter to prevent thundering herd
    const baseDelay = this.connectionState.backoffDelay * Math.pow(2, this.connectionState.reconnectAttempts);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(baseDelay + jitter, 60000); // Cap at 60 seconds instead of 30
    
    this.connectionState.reconnectAttempts++;
    this.connectionState.backoffDelay = Math.min(delay, 60000);

    console.log(`🔄 [OPTIMIZED REALTIME] Reconnecting in ${Math.round(delay)}ms (attempt ${this.connectionState.reconnectAttempts}/${this.connectionState.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      // Health check before reconnecting
      if (this.isNetworkAvailable()) {
        this.connect();
      } else {
        console.warn('⚠️ [OPTIMIZED REALTIME] Network unavailable, rescheduling reconnect');
        this.scheduleReconnect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const lastHeartbeat = this.connectionState.lastHeartbeat;
      
      // Increased tolerance from 60 seconds to 2 minutes
      if (lastHeartbeat && (now.getTime() - lastHeartbeat.getTime()) > 120000) {
        console.warn('⚠️ [OPTIMIZED REALTIME] Heartbeat timeout (2 min), checking connection...');
        
        // Only reconnect if we're supposed to be connected and network is available
        if (this.connectionState.isConnected && this.isNetworkAvailable()) {
          this.connectionState.disconnectReason = 'Heartbeat timeout';
          this.reconnect();
        }
      }
    }, 45000); // Check every 45 seconds instead of 30
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startNetworkMonitoring(): void {
    this.stopNetworkMonitoring();
    
    // Monitor network connectivity
    this.networkCheckInterval = setInterval(() => {
      if (!this.isNetworkAvailable() && this.connectionState.isConnected) {
        console.warn('⚠️ [OPTIMIZED REALTIME] Network unavailable, pausing connection');
        this.connectionState.isConnected = false;
        this.connectionState.disconnectReason = 'Network unavailable';
        this.notifyStatusChange();
      } else if (this.isNetworkAvailable() && !this.connectionState.isConnected && this.connectionState.reconnectAttempts < this.connectionState.maxReconnectAttempts) {
        console.log('🌐 [OPTIMIZED REALTIME] Network restored, attempting reconnection');
        this.reconnect();
      }
    }, 10000); // Check every 10 seconds
    
    // Listen for browser online/offline events
    window.addEventListener('online', this.handleNetworkOnline);
    window.addEventListener('offline', this.handleNetworkOffline);
  }

  private stopNetworkMonitoring(): void {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
    
    window.removeEventListener('online', this.handleNetworkOnline);
    window.removeEventListener('offline', this.handleNetworkOffline);
  }

  private handleNetworkOnline = () => {
    console.log('🌐 [OPTIMIZED REALTIME] Network online detected');
    if (!this.connectionState.isConnected) {
      this.connectionState.reconnectAttempts = 0; // Reset attempts on network restore
      this.reconnect();
    }
  };

  private handleNetworkOffline = () => {
    console.log('🌐 [OPTIMIZED REALTIME] Network offline detected');
    this.connectionState.isConnected = false;
    this.connectionState.disconnectReason = 'Network offline';
    this.notifyStatusChange();
  };

  private isNetworkAvailable(): boolean {
    return navigator.onLine;
  }

  private updateConnectionQuality(): void {
    const now = Date.now();
    const connectionDuration = now - this.connectionStartTime;
    
    if (this.disconnectCount === 0 && connectionDuration > 300000) { // 5 minutes stable
      this.connectionState.connectionQuality = 'excellent';
    } else if (this.disconnectCount < 3 && connectionDuration > 60000) { // 1 minute stable, few disconnects
      this.connectionState.connectionQuality = 'good';
    } else if (this.disconnectCount < 8) {
      this.connectionState.connectionQuality = 'poor';
    } else {
      this.connectionState.connectionQuality = 'critical';
    }
  }

  private getReconnectionGuidance(): string {
    const { connectionQuality, disconnectReason } = this.connectionState;
    
    if (connectionQuality === 'critical') {
      return "Persistent connection issues detected. Try refreshing the page or check your internet connection.";
    }
    
    if (disconnectReason?.includes('timeout')) {
      return "Connection timeouts detected. This may be due to network congestion.";
    }
    
    if (disconnectReason?.includes('error')) {
      return "Server connection errors. Real-time updates will retry automatically.";
    }
    
    return "Connection temporarily unavailable. Real-time updates will resume automatically.";
  }

  private saveConnectionState(): void {
    try {
      const stateToSave = {
        lastConnected: this.connectionState.lastHeartbeat?.toISOString(),
        disconnectCount: this.disconnectCount,
        connectionQuality: this.connectionState.connectionQuality,
        lastDisconnect: this.connectionState.lastDisconnect?.toISOString()
      };
      localStorage.setItem('realtime_connection_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save connection state:', error);
    }
  }

  private loadConnectionState(): void {
    try {
      const saved = localStorage.getItem('realtime_connection_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.disconnectCount = state.disconnectCount || 0;
        this.connectionState.connectionQuality = state.connectionQuality || 'excellent';
        if (state.lastDisconnect) {
          this.connectionState.lastDisconnect = new Date(state.lastDisconnect);
        }
      }
    } catch (error) {
      console.warn('Failed to load connection state:', error);
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.connectionState);
      } catch (error) {
        console.error('❌ [OPTIMIZED REALTIME] Status callback error:', error);
      }
    });
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    console.log('🧹 [OPTIMIZED REALTIME] Cleaning up resources...');
    this.disconnect();
    this.stopNetworkMonitoring();
    this.subscriptions.clear();
    this.statusCallbacks.clear();
  }

  // Initialize with saved state
  initialize(): void {
    this.loadConnectionState();
    this.connectionStartTime = Date.now();
  }
}

// Export singleton instance
export const optimizedRealtimeManager = new OptimizedRealtimeManager();

// Initialize the manager
optimizedRealtimeManager.initialize();
