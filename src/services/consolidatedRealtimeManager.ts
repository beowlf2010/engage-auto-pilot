
import { supabase } from '@/integrations/supabase/client';
import { connectionHealthService } from './connectionHealthService';
import { enhancedMessageProcessor } from './enhancedMessageProcessor';

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

class ConsolidatedRealtimeManager {
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
  private channelName = 'consolidated-realtime-channel';

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  addConnectionListener(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
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
        console.error('❌ [CONSOLIDATED REALTIME] Error in connection listener:', error);
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
    console.log('🔗 [CONSOLIDATED REALTIME] Subscribe request:', config.id);

    if (this.subscriptions.has(config.id)) {
      console.log('⚠️ [CONSOLIDATED REALTIME] Subscription already exists:', config.id);
      return () => this.unsubscribe(config.id);
    }

    this.subscriptions.set(config.id, config);
    this.ensureChannelConnection();

    return () => this.unsubscribe(config.id);
  }

  private unsubscribe(id: string) {
    console.log('🔌 [CONSOLIDATED REALTIME] Unsubscribe:', id);
    this.subscriptions.delete(id);

    if (this.subscriptions.size === 0) {
      this.disconnectChannel();
    }
  }

  private async ensureChannelConnection() {
    if (this.isSubscribing) {
      console.log('⏳ [CONSOLIDATED REALTIME] Already subscribing, skipping');
      return;
    }

    if (this.channel && this.connectionState.isConnected) {
      console.log('✅ [CONSOLIDATED REALTIME] Channel already connected');
      return;
    }

    await this.connectChannel();
  }

  private async connectChannel() {
    if (this.isSubscribing) {
      console.log('⏳ [CONSOLIDATED REALTIME] Already connecting, skipping');
      return;
    }

    this.isSubscribing = true;
    this.updateConnectionState({ status: 'connecting' });
    connectionHealthService.recordConnectionAttempt();

    try {
      if (this.channel) {
        await supabase.removeChannel(this.channel);
        this.channel = null;
      }

      console.log('🔗 [CONSOLIDATED REALTIME] Creating new channel');
      
      this.channel = supabase.channel(this.channelName);

      this.channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload: any) => {
          console.log('📨 [CONSOLIDATED REALTIME] Received payload:', payload.eventType);
          this.handleRealtimeEvent(payload);
        }
      );

      const status = await this.channel.subscribe((status: string) => {
        console.log('📡 [CONSOLIDATED REALTIME] Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          this.updateConnectionState({
            isConnected: true,
            status: 'connected',
            reconnectAttempts: 0
          });
          connectionHealthService.recordConnectionSuccess();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.handleConnectionError();
        }
      });

      console.log('✅ [CONSOLIDATED REALTIME] Channel subscription initiated');

    } catch (error) {
      console.error('❌ [CONSOLIDATED REALTIME] Connection error:', error);
      this.handleConnectionError();
    } finally {
      this.isSubscribing = false;
    }
  }

  private async handleRealtimeEvent(payload: any) {
    // Handle AI message processing first
    if (payload.eventType === 'INSERT' && payload.new?.direction === 'in' && !payload.new?.ai_generated) {
      console.log('🤖 [CONSOLIDATED REALTIME] Processing customer message for AI response');
      
      try {
        // Get lead data for processing
        const { data: leadData } = await supabase
          .from('leads')
          .select('*')
          .eq('id', payload.new.lead_id)
          .single();

        if (leadData?.ai_opt_in === true) {
          await enhancedMessageProcessor.processIncomingMessage(
            payload.new.lead_id,
            payload.new.body,
            leadData
          );
        }
      } catch (error) {
        console.error('❌ [CONSOLIDATED REALTIME] AI processing error:', error);
      }
    }

    // Distribute to all active subscriptions
    this.subscriptions.forEach((config, id) => {
      try {
        config.callback(payload);
      } catch (error) {
        console.error(`❌ [CONSOLIDATED REALTIME] Error in subscription ${id}:`, error);
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
    console.log(`🔄 [CONSOLIDATED REALTIME] Scheduling reconnect in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      if (this.subscriptions.size > 0) {
        this.connectChannel();
      }
    }, delay);
  }

  private disconnectChannel() {
    console.log('🔌 [CONSOLIDATED REALTIME] Disconnecting channel');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
    console.log('🔄 [CONSOLIDATED REALTIME] Force reconnect requested');
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
    console.log('🧹 [CONSOLIDATED REALTIME] Cleanup');
    this.subscriptions.clear();
    this.connectionListeners.clear();
    this.disconnectChannel();
  }
}

export const consolidatedRealtimeManager = new ConsolidatedRealtimeManager();
