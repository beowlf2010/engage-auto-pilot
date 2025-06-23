
import { useState } from 'react';
import { markAllMessagesAsRead } from '@/services/conversationsService';
import { toast } from '@/hooks/use-toast';

export const useMarkAsRead = (onRefresh: () => void) => {
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const markAsRead = async (leadId: string) => {
    if (markingAsRead) return;

    try {
      setMarkingAsRead(leadId);
      
      await markAllMessagesAsRead(leadId);
      
      // Refresh conversations to update unread counts
      onRefresh();
      
      // Trigger global unread count refresh
      console.log('🔄 [MARK AS READ] Triggering global unread count refresh');
      window.dispatchEvent(new CustomEvent('unread-count-changed'));
      
      toast({
        title: "Messages marked as read",
        description: "All messages for this conversation have been marked as read.",
      });
      
    } catch (error) {
      console.error('Error marking messages as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark messages as read. Please try again.",
        variant: "destructive"
      });
    } finally {
      setMarkingAsRead(null);
    }
  };

  return {
    markAsRead,
    markingAsRead
  };
};
