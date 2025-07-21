
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
  private isConnected = false;
  private connectionAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;

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
        'postgres_changes',
        subscription.filters,
        (payload) => {
          this.isConnected = true;
          connectionHealthService.recordConnectionSuccess();
          
          console.log('📨 [STABLE REALTIME] Database change received:', {
            id: subscription.id,
            event: payload.eventType,
            table: payload.table
          });
          
          subscription.callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('🔄 [STABLE REALTIME] Subscription status:', status, 'for', subscription.id);
        
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.connectionAttempts = 0;
          connectionHealthService.recordConnectionSuccess();
          console.log('✅ [STABLE REALTIME] Successfully subscribed:', subscription.id);
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          this.isConnected = false;
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

  isConnected(): boolean {
    return this.isConnected;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      connectionAttempts: this.connectionAttempts,
      healthStatus: connectionHealthService.getHealthStatus()
    };
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
    this.isConnected = false;
  }
}

export const stableRealtimeManager = new StableRealtimeManager();
