
import { supabase } from '@/integrations/supabase/client';
import { connectionHealthService } from './connectionHealthService';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastError: string | null;
}

interface Subscription {
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
  private subscriptions = new Map<string, Subscription>();
  private connectionListeners = new Set<(state: ConnectionState) => void>();
  private connectionState: ConnectionState = {
    isConnected: false,
    status: 'offline',
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    connectionQuality: 'good',
    lastError: null
  };

  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private stateDebounceTimer: NodeJS.Timeout | null = null;
  private isInitializing = false;
  private isCleaningUp = false;

  subscribe(subscription: Subscription): () => void {
    console.log('📡 [STABLE RT] Adding subscription:', subscription.id);
    
    this.subscriptions.set(subscription.id, subscription);
    
    // Initialize connection if this is the first subscription
    if (this.subscriptions.size === 1 && !this.isInitializing) {
      this.initializeConnection();
    } else if (this.channel && this.connectionState.isConnected) {
      // Add to existing channel
      this.addSubscriptionToChannel(subscription);
    }

    return () => {
      console.log('🗑️ [STABLE RT] Removing subscription:', subscription.id);
      this.subscriptions.delete(subscription.id);
      
      // Clean up if no more subscriptions
      if (this.subscriptions.size === 0) {
        this.cleanup();
      }
    };
  }

  private initializeConnection() {
    if (this.isInitializing || this.isCleaningUp) {
      console.log('⚠️ [STABLE RT] Connection initialization blocked - already in progress');
      return;
    }

    this.isInitializing = true;
    console.log('🔗 [STABLE RT] Initializing stable connection');

    this.updateConnectionState({
      status: 'connecting',
      lastError: null
    });

    this.createChannel();
  }

  private createChannel() {
    if (this.channel) {
      console.log('🧹 [STABLE RT] Cleaning up existing channel before creating new one');
      this.cleanupChannel();
    }

    this.channel = supabase.channel('stable-inbox-realtime', {
      config: {
        presence: { key: 'inbox-user' },
        broadcast: { self: false }
      }
    });

    // Add all current subscriptions to the channel
    this.subscriptions.forEach(subscription => {
      this.addSubscriptionToChannel(subscription);
    });

    // Set up connection event handlers
    this.channel.subscribe((status: string) => {
      console.log('📡 [STABLE RT] Channel status:', status);
      this.handleChannelStatus(status);
    });

    this.isInitializing = false;
  }

  private addSubscriptionToChannel(subscription: Subscription) {
    if (!this.channel) return;

    this.channel.on(
      'postgres_changes',
      subscription.filters,
      (payload: any) => {
        console.log('🔄 [STABLE RT] Received update for:', subscription.id);
        
        // Debounce rapid updates
        if (this.stateDebounceTimer) {
          clearTimeout(this.stateDebounceTimer);
        }
        
        this.stateDebounceTimer = setTimeout(() => {
          subscription.callback({
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
        }, 100);
      }
    );
  }

  private handleChannelStatus(status: string) {
    switch (status) {
      case 'SUBSCRIBED':
        this.updateConnectionState({
          isConnected: true,
          status: 'connected',
          lastConnected: new Date(),
          reconnectAttempts: 0,
          lastError: null
        });
        this.startHeartbeat();
        connectionHealthService.recordConnectionSuccess();
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        this.updateConnectionState({
          isConnected: false,
          status: 'failed',
          lastError: `Channel ${status.toLowerCase()}`
        });
        this.scheduleReconnect();
        connectionHealthService.recordConnectionFailure();
        break;
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    const previousState = { ...this.connectionState };
    this.connectionState = { ...this.connectionState, ...updates };

    // Only notify listeners if state actually changed
    const hasChanged = Object.keys(updates).some(key => 
      previousState[key as keyof ConnectionState] !== this.connectionState[key as keyof ConnectionState]
    );

    if (hasChanged) {
      console.log('📊 [STABLE RT] Connection state updated:', this.connectionState.status);
      this.connectionListeners.forEach(listener => {
        try {
          listener(this.connectionState);
        } catch (error) {
          console.error('❌ [STABLE RT] Error notifying connection listener:', error);
        }
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.channel && this.connectionState.isConnected) {
        // Simple heartbeat - just check if channel is still active
        const channelState = this.channel.state;
        if (channelState !== 'joined') {
          console.log('💓 [STABLE RT] Heartbeat failed - channel not joined');
          this.handleChannelStatus('CLOSED');
        }
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionState.reconnectAttempts), 30000);
    console.log(`⏳ [STABLE RT] Scheduling reconnect in ${delay}ms`);

    this.updateConnectionState({
      status: 'reconnecting',
      reconnectAttempts: this.connectionState.reconnectAttempts + 1
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.subscriptions.size > 0) {
        console.log('🔄 [STABLE RT] Attempting reconnect');
        this.createChannel();
      }
    }, delay);
  }

  private cleanupChannel() {
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (error) {
        console.error('❌ [STABLE RT] Error removing channel:', error);
      }
      this.channel = null;
    }
  }

  private cleanup() {
    if (this.isCleaningUp) return;
    
    this.isCleaningUp = true;
    console.log('🧹 [STABLE RT] Cleaning up stable realtime manager');

    // Clear all timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.stateDebounceTimer) {
      clearTimeout(this.stateDebounceTimer);
      this.stateDebounceTimer = null;
    }

    this.stopHeartbeat();

    // Clean up channel
    this.cleanupChannel();

    // Reset state
    this.updateConnectionState({
      isConnected: false,
      status: 'offline',
      reconnectAttempts: 0,
      lastError: null
    });

    this.isCleaningUp = false;
  }

  // Public methods
  addConnectionListener(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
    // Immediately call with current state
    listener(this.connectionState);
    
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  forceReconnect() {
    console.log('🔄 [STABLE RT] Force reconnect requested');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.updateConnectionState({
      reconnectAttempts: 0,
      lastError: null
    });

    if (this.subscriptions.size > 0) {
      this.createChannel();
    }
  }

  getHealthStatus() {
    return {
      ...connectionHealthService.getHealthStatus(),
      activeSubscriptions: this.subscriptions.size,
      connectionState: this.connectionState
    };
  }
}

export const stableRealtimeManager = new StableRealtimeManager();
