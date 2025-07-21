
import { supabase } from '@/integrations/supabase/client';
import type { ConversationListItem } from '@/types/conversation';

interface LoadingProgress {
  stage: 'initializing' | 'loading_basic' | 'loading_details' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

interface LoadOptions {
  maxRetries?: number;
  timeoutMs?: number;
  pageSize?: number;
  progressCallback?: (progress: LoadingProgress) => void;
}

class SmartInboxDataLoader {
  private abortController: AbortController | null = null;

  async loadConversationsRobustly(
    profile: any,
    options: LoadOptions = {}
  ): Promise<ConversationListItem[]> {
    const {
      maxRetries = 3,
      timeoutMs = 30000,
      pageSize = 50,
      progressCallback
    } = options;

    // Cancel any existing request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    let attempt = 0;
    const startTime = Date.now();

    while (attempt < maxRetries) {
      try {
        progressCallback?.({
          stage: 'initializing',
          progress: 10,
          message: `Loading conversations (attempt ${attempt + 1}/${maxRetries})...`
        });

        console.log(`📊 [SMART INBOX LOADER] Attempt ${attempt + 1}/${maxRetries} starting`);

        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        // Load data with timeout protection
        const dataPromise = this.loadConversationsWithProgressiveLoading(
          profile,
          pageSize,
          progressCallback
        );

        const result = await Promise.race([dataPromise, timeoutPromise]);
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ [SMART INBOX LOADER] Successfully loaded ${result.length} conversations in ${loadTime}ms`);
        
        progressCallback?.({
          stage: 'complete',
          progress: 100,
          message: `Loaded ${result.length} conversations successfully`
        });

        return result;

      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`❌ [SMART INBOX LOADER] Attempt ${attempt} failed:`, {
          error: errorMessage,
          attempt,
          maxRetries,
          timeElapsed: Date.now() - startTime
        });

        if (attempt >= maxRetries) {
          progressCallback?.({
            stage: 'error',
            progress: 0,
            message: 'Failed to load conversations after multiple attempts',
            error: errorMessage
          });
          throw new Error(`Failed to load conversations after ${maxRetries} attempts. Last error: ${errorMessage}`);
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ [SMART INBOX LOADER] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  private async loadConversationsWithProgressiveLoading(
    profile: any,
    pageSize: number,
    progressCallback?: (progress: LoadingProgress) => void
  ): Promise<ConversationListItem[]> {
    
    progressCallback?.({
      stage: 'loading_basic',
      progress: 20,
      message: 'Loading leads data...'
    });

    // Step 1: Load basic leads data
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        email,
        vehicle_interest,
        status,
        source,
        lead_type_name,
        salesperson_id,
        ai_opt_in,
        phone_numbers (
          number,
          is_primary
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .limit(pageSize)
      .abortSignal(this.abortController?.signal);

    if (leadsError) {
      throw new Error(`Failed to load leads: ${leadsError.message}`);
    }

    if (!leadsData || leadsData.length === 0) {
      console.log('📝 [SMART INBOX LOADER] No leads found');
      return [];
    }

    progressCallback?.({
      stage: 'loading_details',
      progress: 50,
      message: 'Loading conversation data...'
    });

    // Step 2: Load conversations for these leads
    const leadIds = leadsData.map(lead => lead.id);
    
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('lead_id, direction, read_at, body, sent_at')
      .in('lead_id', leadIds)
      .order('sent_at', { ascending: false })
      .abortSignal(this.abortController?.signal);

    if (conversationsError) {
      throw new Error(`Failed to load conversations: ${conversationsError.message}`);
    }

    progressCallback?.({
      stage: 'processing',
      progress: 80,
      message: 'Processing conversation data...'
    });

    // Step 3: Process data safely
    const result = this.processConversationData(leadsData, conversationsData || []);
    
    console.log(`📊 [SMART INBOX LOADER] Processed ${result.length} conversations from ${leadsData.length} leads`);
    
    return result;
  }

  private processConversationData(leadsData: any[], conversationsData: any[]): ConversationListItem[] {
    try {
      const conversationMap = new Map<string, {
        leadData: any;
        latestConversation: any;
        unreadCount: number;
        totalMessages: number;
      }>();

      // Group conversations by lead
      conversationsData.forEach((conv: any) => {
        const leadId = conv.lead_id;
        if (!leadId) return;

        const leadData = leadsData.find(lead => lead.id === leadId);
        if (!leadData) return;

        const existing = conversationMap.get(leadId);
        const isUnread = conv.direction === 'in' && !conv.read_at;
        
        if (!existing) {
          conversationMap.set(leadId, {
            leadData,
            latestConversation: conv,
            unreadCount: isUnread ? 1 : 0,
            totalMessages: 1
          });
        } else {
          if (new Date(conv.sent_at) > new Date(existing.latestConversation.sent_at)) {
            existing.latestConversation = conv;
          }
          if (isUnread) {
            existing.unreadCount++;
          }
          existing.totalMessages++;
        }
      });

      // Convert to ConversationListItem format
      const result: ConversationListItem[] = Array.from(conversationMap.entries()).map(([leadId, group]) => {
        const { leadData, latestConversation, unreadCount, totalMessages } = group;
        
        const primaryPhone = leadData.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                            leadData.phone_numbers?.[0]?.number || 
                            'No phone';

        return {
          leadId,
          leadName: `${leadData.first_name || 'Unknown'} ${leadData.last_name || 'Lead'}`.trim(),
          primaryPhone,
          leadPhone: primaryPhone,
          leadEmail: leadData.email || '',
          lastMessage: latestConversation.body || 'No message content',
          lastMessageTime: new Date(latestConversation.sent_at).toLocaleString(),
          lastMessageDirection: latestConversation.direction as 'in' | 'out',
          lastMessageDate: new Date(latestConversation.sent_at),
          unreadCount,
          messageCount: totalMessages,
          salespersonId: leadData.salesperson_id,
          vehicleInterest: leadData.vehicle_interest || 'Not specified',
          leadSource: leadData.source || '',
          leadType: leadData.lead_type_name || 'unknown',
          status: leadData.status || 'new',
          salespersonName: leadData.profiles ? 
            `${leadData.profiles.first_name} ${leadData.profiles.last_name}`.trim() : undefined,
          aiOptIn: leadData.ai_opt_in || false
        };
      });

      // Sort by unread first, then by last message time
      result.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
      });

      return result;

    } catch (error) {
      console.error('❌ [SMART INBOX LOADER] Error processing conversation data:', error);
      throw new Error(`Failed to process conversation data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  cleanup() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const smartInboxDataLoader = new SmartInboxDataLoader();
