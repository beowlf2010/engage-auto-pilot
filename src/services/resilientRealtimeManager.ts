
import { supabase } from '@/integrations/supabase/client';
import { connectionHealthService } from './connectionHealthService';

interface RealtimeSubscription {
  id: string;
  callback: (payload: any) => void;
  filters: {
    event: string;
    schema: string;
    table: string;
  };
}

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

class ResilientRealtimeManager {
  private subscriptions = new Map<string, RealtimeSubscription>();
  private channel: any = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    status: 'offline',
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    connectionQuality: 'good',
    lastError: null,
    disconnectReason: null
  };
  
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isPollingFallback = false;
  private listeners = new Set<(state: ConnectionState) => void>();

  constructor() {
    // Monitor network connectivity
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkOnline());
      window.addEventListener('offline', () => this.handleNetworkOffline());
    }
  }

  subscribe(subscription: RealtimeSubscription) {
    console.log('📡 [RESILIENT REALTIME] Adding subscription:', subscription.id);
    this.subscriptions.set(subscription.id, subscription);
    
    if (!this.channel) {
      this.initializeConnection();
    } else {
      this.addSubscriptionToChannel(subscription);
    }

    return () => this.unsubscribe(subscription.id);
  }

  unsubscribe(subscriptionId: string) {
    console.log('🗑️ [RESILIENT REALTIME] Removing subscription:', subscriptionId);
    this.subscriptions.delete(subscriptionId);
    
    if (this.subscriptions.size === 0) {
      this.cleanup();
    }
  }

  private async initializeConnection() {
    if (this.isPollingFallback || connectionHealthService.getHealthStatus().shouldUsePolling) {
      console.log('🔄 [RESILIENT REALTIME] Starting in polling mode due to connection issues');
      this.startPollingFallback();
      return;
    }

    this.updateConnectionState({
      status: 'connecting',
      lastError: null
    });

    connectionHealthService.recordConnectionAttempt();
    
    try {
      await this.createRealtimeChannel();
    } catch (error) {
      console.error('❌ [RESILIENT REALTIME] Failed to create channel:', error);
      this.handleConnectionError(error);
    }
  }

  private async createRealtimeChannel() {
    const channelName = `resilient-realtime-${Date.now()}`;
    console.log('🔌 [RESILIENT REALTIME] Creating channel:', channelName);

    this.channel = supabase.channel(channelName);

    // Add all existing subscriptions to the channel
    this.subscriptions.forEach(subscription => {
      this.addSubscriptionToChannel(subscription);
    });

    // Set up connection event handlers
    this.channel
      .on('system', {}, (payload: any) => {
        console.log('📡 [RESILIENT REALTIME] System event:', payload);
        this.handleSystemEvent(payload);
      });

    // Subscribe to the channel
    const subscribePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.channel.subscribe((status: string) => {
        clearTimeout(timeout);
        console.log('📡 [RESILIENT REALTIME] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          this.handleConnectionSuccess();
          resolve(status);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Subscription failed: ${status}`));
        }
      });
    });

    await subscribePromise;
  }

  private addSubscriptionToChannel(subscription: RealtimeSubscription) {
    if (!this.channel) return;

    this.channel.on(
      'postgres_changes',
      subscription.filters,
      (payload: any) => {
        console.log('📨 [RESILIENT REALTIME] Received update for:', subscription.id);
        subscription.callback(payload);
      }
    );
  }

  private handleConnectionSuccess() {
    connectionHealthService.recordConnectionSuccess();
    
    this.updateConnectionState({
      isConnected: true,
      status: 'connected',
      lastConnected: new Date(),
      reconnectAttempts: 0,
      connectionQuality: connectionHealthService.getHealthStatus().networkQuality,
      lastError: null,
      disconnectReason: null
    });

    this.startHeartbeat();
    this.stopPollingFallback();
    console.log('✅ [RESILIENT REALTIME] Connection established successfully');
  }

  private handleConnectionError(error: any) {
    connectionHealthService.recordConnectionFailure();
    
    const errorMessage = error?.message || 'Unknown connection error';
    console.error('❌ [RESILIENT REALTIME] Connection error:', errorMessage);
    
    this.updateConnectionState({
      isConnected: false,
      status: 'failed',
      lastError: errorMessage,
      disconnectReason: errorMessage
    });

    this.scheduleReconnect();
  }

  private handleSystemEvent(payload: any) {
    if (payload.type === 'close') {
      console.log('🔌 [RESILIENT REALTIME] Connection closed:', payload.reason);
      this.updateConnectionState({
        isConnected: false,
        status: 'offline',
        disconnectReason: payload.reason || 'Connection closed'
      });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      console.warn('⚠️ [RESILIENT REALTIME] Max reconnection attempts reached, switching to polling');
      this.startPollingFallback();
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.connectionState.reconnectAttempts), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(`🔄 [RESILIENT REALTIME] Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.connectionState.reconnectAttempts + 1})`);

    this.updateConnectionState({
      status: 'reconnecting',
      reconnectAttempts: this.connectionState.reconnectAttempts + 1
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private async reconnect() {
    console.log('🔄 [RESILIENT REALTIME] Attempting to reconnect...');
    
    // Clean up existing connection
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    // Attempt to reconnect
    await this.initializeConnection();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.channel && this.connectionState.isConnected) {
        // Send a simple ping to check connection health
        this.channel.send({
          type: 'heartbeat',
          event: 'ping',
          payload: { timestamp: new Date().toISOString() }
        });
      }
    }, 30000); // Every 30 seconds
  }

  private handleNetworkOnline() {
    console.log('🌐 [RESILIENT REALTIME] Network back online, attempting reconnect');
    connectionHealthService.reset();
    this.reconnect();
  }

  private handleNetworkOffline() {
    console.log('🌐 [RESILIENT REALTIME] Network offline detected');
    this.updateConnectionState({
      isConnected: false,
      status: 'offline',
      disconnectReason: 'Network offline'
    });
    this.startPollingFallback();
  }

  private startPollingFallback() {
    if (this.isPollingFallback) return;

    console.log('🔄 [RESILIENT REALTIME] Starting polling fallback mode');
    this.isPollingFallback = true;
    
    this.updateConnectionState({
      status: 'offline'
    });

    // Poll for updates every 30 seconds
    this.pollingTimer = setInterval(() => {
      console.log('🔄 [RESILIENT REALTIME] Polling for updates...');
      this.subscriptions.forEach(subscription => {
        // Trigger a generic update event for polling
        subscription.callback({
          eventType: 'POLL_UPDATE',
          table: subscription.filters.table,
          schema: subscription.filters.schema,
          new: null,
          old: null
        });
      });
    }, 30000);
  }

  private stopPollingFallback() {
    if (!this.isPollingFallback) return;

    console.log('✅ [RESILIENT REALTIME] Stopping polling fallback mode');
    this.isPollingFallback = false;
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates };
    
    // Notify all listeners
    this.listeners.forEach(listener => listener(this.connectionState));
  }

  // Public methods
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  addConnectionListener(listener: (state: ConnectionState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  forceReconnect() {
    console.log('🔄 [RESILIENT REALTIME] Force reconnect requested');
    this.connectionState.reconnectAttempts = 0;
    this.stopPollingFallback();
    connectionHealthService.reset();
    this.reconnect();
  }

  getHealthStatus() {
    return connectionHealthService.getHealthStatus();
  }

  cleanup() {
    console.log('🧹 [RESILIENT REALTIME] Cleaning up...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    this.stopPollingFallback();
    
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    
    this.subscriptions.clear();
    this.listeners.clear();
  }
}

export const resilientRealtimeManager = new ResilientRealtimeManager();
