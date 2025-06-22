
interface CachedMessages {
  messages: any[];
  timestamp: number;
  leadId: string;
}

interface CachedConversations {
  conversations: any[];
  timestamp: number;
}

class MessageCacheService {
  private messageCache = new Map<string, CachedMessages>();
  private conversationCache: CachedConversations | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  // Cache messages for a lead
  cacheMessages(leadId: string, messages: any[]): void {
    this.messageCache.set(leadId, {
      messages: [...messages],
      timestamp: Date.now(),
      leadId
    });
  }

  // Get cached messages if still valid
  getCachedMessages(leadId: string): any[] | null {
    const cached = this.messageCache.get(leadId);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.messageCache.delete(leadId);
      return null;
    }
    
    return cached.messages;
  }

  // Cache conversations list
  cacheConversations(conversations: any[]): void {
    this.conversationCache = {
      conversations: [...conversations],
      timestamp: Date.now()
    };
  }

  // Get cached conversations if still valid
  getCachedConversations(): any[] | null {
    if (!this.conversationCache) return null;
    
    const isExpired = Date.now() - this.conversationCache.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.conversationCache = null;
      return null;
    }
    
    return this.conversationCache.conversations;
  }

  // Invalidate cache for a specific lead (when new message sent)
  invalidateLeadCache(leadId: string): void {
    this.messageCache.delete(leadId);
    // Also invalidate conversations cache since unread counts may change
    this.conversationCache = null;
  }

  // Clear all cache
  clearAll(): void {
    this.messageCache.clear();
    this.conversationCache = null;
  }

  // Update single message in cache (optimistic updates)
  addMessageToCache(leadId: string, message: any): void {
    const cached = this.messageCache.get(leadId);
    if (cached) {
      cached.messages.push(message);
      cached.timestamp = Date.now(); // Refresh timestamp
    }
  }
}

export const messageCacheService = new MessageCacheService();
