import { supabase } from '@/integrations/supabase/client';
import { connectionHealthService } from './connectionHealthService';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface SubscriptionConfig {
  id: string;
  callback: (payload: any) => void;
  filters: {
    event: string;
    schema: string;
    table: string;
  };
}

class StableRealtimeManager {
  private channel: any = null;
  private subscriptions = new Map<string, SubscriptionConfig>();
  private connectionState: ConnectionState = {
    isConnected: false,
    status: 'offline',
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  };
  private connectionListeners = new Set<(state: ConnectionState) => void>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isSubscribing = false;
  private channelName = 'stable-realtime-channel';
  private heartbeatInterval: NodeJS.Timeout | null = null;

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  addConnectionListener(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
    // Immediately call with current state
    listener(this.getConnectionState());
    
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  private notifyConnectionListeners() {
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.getConnectionState());
      } catch (error) {
        console.error('❌ [STABLE REALTIME] Error in connection listener:', error);
      }
    });
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    const changed = Object.keys(updates).some(key => 
      this.connectionState[key as keyof ConnectionState] !== updates[key as keyof ConnectionState]
    );

    if (changed) {
      this.connectionState = { ...this.connectionState, ...updates };
      this.notifyConnectionListeners();
    }
  }

  subscribe(config: SubscriptionConfig): () => void {
    console.log('🔗 [STABLE REALTIME] Subscribe request:', config.id);

    // Prevent duplicate subscriptions
    if (this.subscriptions.has(config.id)) {
      console.log('⚠️ [STABLE REALTIME] Subscription already exists:', config.id);
      return () => this.unsubscribe(config.id);
    }

    this.subscriptions.set(config.id, config);
    this.ensureChannelConnection();

    return () => this.unsubscribe(config.id);
  }

  private unsubscribe(id: string) {
    console.log('🔌 [STABLE REALTIME] Unsubscribe:', id);
    this.subscriptions.delete(id);

    if (this.subscriptions.size === 0) {
      this.disconnectChannel();
    }
  }

  private async ensureChannelConnection() {
    if (this.isSubscribing) {
      console.log('⏳ [STABLE REALTIME] Already subscribing, skipping');
      return;
    }

    if (this.channel && this.connectionState.isConnected) {
      console.log('✅ [STABLE REALTIME] Channel already connected');
      return;
    }

    await this.connectChannel();
  }

  private async connectChannel() {
    if (this.isSubscribing) {
      console.log('⏳ [STABLE REALTIME] Already connecting, skipping');
      return;
    }

    this.isSubscribing = true;
    this.updateConnectionState({ status: 'connecting' });
    connectionHealthService.recordConnectionAttempt();

    try {
      // Clean up existing channel first
      if (this.channel) {
        await supabase.removeChannel(this.channel);
        this.channel = null;
      }

      console.log('🔗 [STABLE REALTIME] Creating new channel');
      
      this.channel = supabase.channel(this.channelName, {
        config: {
          presence: {
            key: 'user_presence'
          }
        }
      });

      // Set up postgres changes listener
      this.channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload: any) => {
          console.log('📨 [STABLE REALTIME] Received payload:', payload.eventType);
          this.handleRealtimeEvent(payload);
        }
      );

      // Subscribe to the channel with proper error handling
      const status = await this.channel.subscribe((status: string) => {
        console.log('📡 [STABLE REALTIME] Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          this.updateConnectionState({
            isConnected: true,
            status: 'connected',
            reconnectAttempts: 0
          });
          connectionHealthService.recordConnectionSuccess();
          this.startHeartbeat();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.handleConnectionError();
        }
      });

      console.log('✅ [STABLE REALTIME] Channel subscription initiated');

    } catch (error) {
      console.error('❌ [STABLE REALTIME] Connection error:', error);
      this.handleConnectionError();
    } finally {
      this.isSubscribing = false;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send a heartbeat every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.channel && this.connectionState.isConnected) {
        this.channel.send({
          type: 'heartbeat',
          event: 'ping',
          payload: { timestamp: Date.now() }
        });
      }
    }, 30000);
  }

  private handleRealtimeEvent(payload: any) {
    // Distribute to all active subscriptions
    this.subscriptions.forEach((config, id) => {
      try {
        config.callback(payload);
      } catch (error) {
        console.error(`❌ [STABLE REALTIME] Error in subscription ${id}:`, error);
      }
    });
  }

  private handleConnectionError() {
    connectionHealthService.recordConnectionFailure();
    const newAttempts = this.connectionState.reconnectAttempts + 1;
    
    this.updateConnectionState({
      isConnected: false,
      status: newAttempts >= this.connectionState.maxReconnectAttempts ? 'failed' : 'reconnecting',
      reconnectAttempts: newAttempts
    });

    if (newAttempts < this.connectionState.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionState.reconnectAttempts), 30000);
    console.log(`🔄 [STABLE REALTIME] Scheduling reconnect in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      if (this.subscriptions.size > 0) {
        this.connectChannel();
      }
    }, delay);
  }

  private disconnectChannel() {
    console.log('🔌 [STABLE REALTIME] Disconnecting channel');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.updateConnectionState({
      isConnected: false,
      status: 'offline',
      reconnectAttempts: 0
    });
  }

  forceReconnect() {
    console.log('🔄 [STABLE REALTIME] Force reconnect requested');
    this.disconnectChannel();
    
    if (this.subscriptions.size > 0) {
      setTimeout(() => this.connectChannel(), 100);
    }
  }

  getHealthStatus() {
    return {
      ...connectionHealthService.getHealthStatus(),
      activeSubscriptions: this.subscriptions.size,
      channelStatus: this.channel?.state || 'none'
    };
  }

  cleanup() {
    console.log('🧹 [STABLE REALTIME] Cleanup');
    this.subscriptions.clear();
    this.connectionListeners.clear();
    this.disconnectChannel();
  }
}

export const stableRealtimeManager = new StableRealtimeManager();
