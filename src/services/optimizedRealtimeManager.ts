
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ConnectionState {
  isConnected: boolean;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  backoffDelay: number;
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
    maxReconnectAttempts: 5,
    backoffDelay: 1000
  };
  private subscriptions = new Map<string, RealtimeSubscription>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private statusCallbacks = new Set<(state: ConnectionState) => void>();

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
        break;
        
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        this.connectionState.isConnected = false;
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
      console.warn('⚠️ [OPTIMIZED REALTIME] Max reconnection attempts reached');
      toast({
        title: "Connection Lost",
        description: "Real-time updates are temporarily unavailable. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    this.clearReconnectTimeout();

    const delay = this.connectionState.backoffDelay * Math.pow(2, this.connectionState.reconnectAttempts);
    this.connectionState.reconnectAttempts++;
    this.connectionState.backoffDelay = Math.min(delay, 30000);

    console.log(`🔄 [OPTIMIZED REALTIME] Reconnecting in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const lastHeartbeat = this.connectionState.lastHeartbeat;
      
      if (lastHeartbeat && (now.getTime() - lastHeartbeat.getTime()) > 60000) {
        console.warn('⚠️ [OPTIMIZED REALTIME] Heartbeat timeout, reconnecting...');
        this.reconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
    this.subscriptions.clear();
    this.statusCallbacks.clear();
  }
}

// Export singleton instance
export const optimizedRealtimeManager = new OptimizedRealtimeManager();
