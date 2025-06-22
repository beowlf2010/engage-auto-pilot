
import { supabase } from '@/integrations/supabase/client';
import { optimizedConversationService } from './optimizedConversationService';
import { messageCacheService } from './messageCacheService';
import { ConversationListItem, MessageData } from '@/types/conversation';

interface RealtimeUpdate {
  type: 'conversation_update' | 'message_update' | 'unread_update';
  data: any;
  leadId?: string;
}

interface ConnectionState {
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

class EnhancedRealtimeService {
  private channel: any = null;
  private subscribers = new Set<(update: RealtimeUpdate) => void>();
  private connectionState: ConnectionState = {
    isConnected: false,
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private updateQueue: RealtimeUpdate[] = [];
  private isProcessingQueue = false;

  // Subscribe to real-time updates
  subscribe(callback: (update: RealtimeUpdate) => void): () => void {
    this.subscribers.add(callback);
    
    // Initialize connection if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      
      // Cleanup connection if no more subscribers
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Force reconnection
  reconnect(): void {
    console.log('🔌 [ENHANCED REALTIME] Manual reconnection requested');
    this.disconnect();
    this.connect();
  }

  // Optimistically add message to cache and notify subscribers
  optimisticallyAddMessage(leadId: string, message: Partial<MessageData>): void {
    const optimisticMessage: MessageData = {
      id: `optimistic-${Date.now()}`,
      leadId,
      direction: 'out',
      body: message.body || '',
      sentAt: new Date().toISOString(),
      aiGenerated: false,
      smsStatus: 'sending',
      ...message
    };

    // Add to cache optimistically
    messageCacheService.addMessageToCache(leadId, optimisticMessage);

    // Notify subscribers
    this.notifySubscribers({
      type: 'message_update',
      leadId,
      data: { optimistic: true, message: optimisticMessage }
    });

    console.log('⚡ [ENHANCED REALTIME] Optimistic message added:', optimisticMessage.id);
  }

  // Update message status (e.g., from sending to sent)
  updateMessageStatus(leadId: string, messageId: string, status: string, error?: string): void {
    // Update cache
    const cachedMessages = messageCacheService.getCachedMessages(leadId);
    if (cachedMessages) {
      const updatedMessages = cachedMessages.map(msg => 
        msg.id === messageId 
          ? { ...msg, smsStatus: status, smsError: error }
          : msg
      );
      messageCacheService.cacheMessages(leadId, updatedMessages);
    }

    // Notify subscribers
    this.notifySubscribers({
      type: 'message_update',
      leadId,
      data: { statusUpdate: true, messageId, status, error }
    });

    console.log('📱 [ENHANCED REALTIME] Message status updated:', { messageId, status });
  }

  private connect(): void {
    if (this.channel) {
      this.disconnect();
    }

    console.log('🔌 [ENHANCED REALTIME] Connecting to real-time channels...');

    this.channel = supabase
      .channel('enhanced-inbox-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        this.handleConversationChange(payload);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads'
      }, (payload) => {
        this.handleNewLead(payload);
      })
      .subscribe((status) => {
        this.handleSubscriptionStatus(status);
      });
  }

  private disconnect(): void {
    if (this.channel) {
      console.log('🔌 [ENHANCED REALTIME] Disconnecting from real-time channels...');
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.connectionState.isConnected = false;
  }

  private handleSubscriptionStatus(status: string): void {
    console.log('📡 [ENHANCED REALTIME] Subscription status:', status);

    switch (status) {
      case 'SUBSCRIBED':
        this.connectionState.isConnected = true;
        this.connectionState.lastConnected = new Date();
        this.connectionState.reconnectAttempts = 0;
        this.processUpdateQueue();
        break;
        
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        this.connectionState.isConnected = false;
        this.scheduleReconnect();
        break;
    }

    // Notify subscribers of connection state change
    this.notifySubscribers({
      type: 'conversation_update',
      data: { connectionState: this.connectionState }
    });
  }

  private handleConversationChange(payload: any): void {
    console.log('💬 [ENHANCED REALTIME] Conversation change:', payload.eventType);

    const update: RealtimeUpdate = {
      type: 'message_update',
      leadId: payload.new?.lead_id || payload.old?.lead_id,
      data: payload
    };

    if (payload.eventType === 'INSERT' && payload.new?.direction === 'in') {
      // Incoming message - invalidate cache for this lead and update conversations
      if (payload.new.lead_id) {
        messageCacheService.invalidateLeadCache(payload.new.lead_id);
        optimizedConversationService.invalidateCache();
      }

      // High priority update for incoming messages
      this.notifySubscribers(update);
      
      // Also trigger unread count update
      this.notifySubscribers({
        type: 'unread_update',
        data: { leadId: payload.new.lead_id }
      });
    } else {
      // Queue other updates to prevent UI thrashing
      this.queueUpdate(update);
    }
  }

  private handleNewLead(payload: any): void {
    console.log('👤 [ENHANCED REALTIME] New lead:', payload.new?.id);
    
    // Invalidate conversation cache to include new lead
    optimizedConversationService.invalidateCache();
    
    this.notifySubscribers({
      type: 'conversation_update',
      data: { newLead: payload.new }
    });
  }

  private queueUpdate(update: RealtimeUpdate): void {
    this.updateQueue.push(update);
    
    if (!this.isProcessingQueue) {
      // Process queue with debouncing to prevent UI thrashing
      setTimeout(() => this.processUpdateQueue(), 500);
    }
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 [ENHANCED REALTIME] Processing ${this.updateQueue.length} queued updates`);

    // Group updates by type and lead for efficiency
    const groupedUpdates = this.groupUpdates(this.updateQueue);
    this.updateQueue = [];

    // Process grouped updates
    for (const [type, updates] of Object.entries(groupedUpdates)) {
      switch (type) {
        case 'message_update':
          await this.processBatchedMessageUpdates(updates);
          break;
        case 'conversation_update':
          await this.processBatchedConversationUpdates(updates);
          break;
      }
    }

    this.isProcessingQueue = false;

    // Process any new updates that came in while we were processing
    if (this.updateQueue.length > 0) {
      setTimeout(() => this.processUpdateQueue(), 100);
    }
  }

  private groupUpdates(updates: RealtimeUpdate[]): Record<string, RealtimeUpdate[]> {
    return updates.reduce((groups, update) => {
      const key = update.type;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(update);
      return groups;
    }, {} as Record<string, RealtimeUpdate[]>);
  }

  private async processBatchedMessageUpdates(updates: RealtimeUpdate[]): Promise<void> {
    // Get unique lead IDs that need cache invalidation
    const leadIds = [...new Set(updates.map(u => u.leadId).filter(Boolean))];
    
    // Invalidate caches for affected leads
    leadIds.forEach(leadId => {
      if (leadId) messageCacheService.invalidateLeadCache(leadId);
    });

    // Notify subscribers of the batched update
    this.notifySubscribers({
      type: 'message_update',
      data: { batchUpdate: true, affectedLeads: leadIds }
    });
  }

  private async processBatchedConversationUpdates(updates: RealtimeUpdate[]): Promise<void> {
    // Invalidate conversation cache
    optimizedConversationService.invalidateCache();

    // Notify subscribers
    this.notifySubscribers({
      type: 'conversation_update',
      data: { batchUpdate: true, updateCount: updates.length }
    });
  }

  private scheduleReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      console.warn('⚠️ [ENHANCED REALTIME] Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionState.reconnectAttempts), 30000);
    this.connectionState.reconnectAttempts++;

    console.log(`🔄 [ENHANCED REALTIME] Scheduling reconnect in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notifySubscribers(update: RealtimeUpdate): void {
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('❌ [ENHANCED REALTIME] Subscriber callback error:', error);
      }
    });
  }
}

export const enhancedRealtimeService = new EnhancedRealtimeService();
