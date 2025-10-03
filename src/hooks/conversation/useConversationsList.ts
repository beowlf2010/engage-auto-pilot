import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchConversations } from '@/services/conversationsService';
import type { ConversationListItem } from './conversationTypes';

/**
 * React Query hook for fetching conversations list
 * 
 * CONSOLIDATED: This hook now uses conversationsService.fetchConversations()
 * which provides:
 * - Phone number normalization for proper thread matching
 * - Consistent conversation grouping logic
 * - Role-based filtering (admin/manager vs sales)
 * - Proper unread count calculation
 * 
 * All conversation fetching should go through this service to ensure consistency.
 */
export const useConversationsList = () => {
  const { profile, user, session } = useAuth();

  const { data: conversations = [], isLoading: conversationsLoading, error, refetch: refetchConversations } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async () => {
      const startTime = performance.now();
      console.log('🔄 [CONVERSATIONS LIST HOOK] Starting query via service...', {
        timestamp: new Date().toISOString(),
        profileId: profile?.id,
        userEmail: user?.email,
        sessionExists: !!session
      });

      if (!profile) {
        console.log('❌ [CONVERSATIONS LIST HOOK] No profile found, returning empty array');
        return [];
      }

      try {
        // Use the centralized service which handles phone normalization
        const result = await fetchConversations(profile);
        
        const endTime = performance.now();
        console.log(`✅ [CONVERSATIONS LIST HOOK] Service call complete:`, {
          totalConversations: result.length,
          withUnread: result.filter(c => c.unreadCount > 0).length,
          totalUnreadMessages: result.reduce((sum, c) => sum + c.unreadCount, 0),
          processingTime: Math.round(endTime - startTime) + 'ms'
        });
        
        return result;
      } catch (err) {
        console.error('❌ [CONVERSATIONS LIST HOOK] Error loading conversations:', err);
        throw err;
      }
    },
    enabled: !!profile,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Log any errors
  if (error) {
    console.error('❌ [CONVERSATIONS LIST] Query error:', error);
  }

  return {
    conversations,
    conversationsLoading,
    refetchConversations,
    error
  };
};
