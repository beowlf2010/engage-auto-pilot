
import { supabase } from '@/integrations/supabase/client';
import { connectionHealthService } from './connectionHealthService';

interface StableRealtimeSubscription {
  id: string;
  callback: (payload: any) => void;
  filters: {
    event: string;
    schema: string;
    table: string;
  };
}

class StableRealtimeManager {
  private subscriptions = new Map<string, any>();
  private connected = false;
  private connectionAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionListeners = new Set<(connected: boolean) => void>();

  constructor() {
    console.log('🟢 [STABLE REALTIME] Manager initialized');
  }

  subscribe(subscription: StableRealtimeSubscription): () => void {
    if (this.subscriptions.has(subscription.id)) {
      console.log('🟡 [STABLE REALTIME] Subscription already exists:', subscription.id);
      return this.subscriptions.get(subscription.id).unsubscribe;
    }

    console.log('🔗 [STABLE REALTIME] Creating subscription:', subscription.id);

    const channel = supabase
      .channel(`stable-${subscription.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: subscription.filters.event,
          schema: subscription.filters.schema,
          table: subscription.filters.table
        },
        (payload) => {
          this.setConnected(true);
          connectionHealthService.recordConnectionSuccess();
          
          console.log('📨 [STABLE REALTIME] Database change received:', {
            id: subscription.id,
            event: (payload as any).eventType || 'unknown',
            table: subscription.filters.table
          });
          
          subscription.callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('🔄 [STABLE REALTIME] Subscription status:', status, 'for', subscription.id);
        
        if (status === 'SUBSCRIBED') {
          this.setConnected(true);
          this.connectionAttempts = 0;
          connectionHealthService.recordConnectionSuccess();
          console.log('✅ [STABLE REALTIME] Successfully subscribed:', subscription.id);
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          this.setConnected(false);
          connectionHealthService.recordConnectionFailure();
          this.handleConnectionFailure(subscription);
        }
      });

    const unsubscribe = () => {
      console.log('🗑️ [STABLE REALTIME] Unsubscribing:', subscription.id);
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscription.id);
    };

    this.subscriptions.set(subscription.id, { channel, unsubscribe });
    connectionHealthService.recordConnectionAttempt();

    return unsubscribe;
  }

  private handleConnectionFailure(subscription: StableRealtimeSubscription) {
    if (this.connectionAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️ [STABLE REALTIME] Max reconnection attempts reached for:', subscription.id);
      return;
    }

    this.connectionAttempts++;
    console.log(`🔄 [STABLE REALTIME] Attempting reconnection ${this.connectionAttempts}/${this.maxReconnectAttempts} for:`, subscription.id);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      // Remove failed subscription and recreate
      const existingSubscription = this.subscriptions.get(subscription.id);
      if (existingSubscription) {
        supabase.removeChannel(existingSubscription.channel);
        this.subscriptions.delete(subscription.id);
        
        // Recreate subscription
        this.subscribe(subscription);
      }
    }, this.reconnectDelay);
  }

  forceReconnect(): void {
    console.log('🔄 [STABLE REALTIME] Force reconnection requested');
    this.connectionAttempts = 0;
    
    // Recreate all subscriptions
    const currentSubscriptions = Array.from(this.subscriptions.keys());
    currentSubscriptions.forEach(id => {
      const subscription = this.subscriptions.get(id);
      if (subscription) {
        supabase.removeChannel(subscription.channel);
        this.subscriptions.delete(id);
      }
    });
  }

  private setConnected(connected: boolean) {
    if (this.connected !== connected) {
      this.connected = connected;
      this.connectionListeners.forEach(listener => listener(connected));
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  addConnectionListener(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  getConnectionStatus() {
    return {
      isConnected: this.connected,
      subscriptionCount: this.subscriptions.size,
      connectionAttempts: this.connectionAttempts,
      healthStatus: connectionHealthService.getHealthStatus()
    };
  }

  getConnectionState() {
    return {
      isConnected: this.connected,
      reconnectAttempts: this.connectionAttempts
    };
  }

  getHealthStatus() {
    return connectionHealthService.getHealthStatus();
  }

  cleanup(): void {
    console.log('🧹 [STABLE REALTIME] Cleaning up all subscriptions');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.subscriptions.forEach((subscription, id) => {
      console.log('🗑️ [STABLE REALTIME] Removing subscription:', id);
      supabase.removeChannel(subscription.channel);
    });
    
    this.subscriptions.clear();
    this.setConnected(false);
  }
}

export const stableRealtimeManager = new StableRealtimeManager();
