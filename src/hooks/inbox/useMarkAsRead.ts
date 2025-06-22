
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
