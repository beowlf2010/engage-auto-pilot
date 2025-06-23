
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMarkAsRead = () => {
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  const markAsRead = async (leadId: string) => {
    if (!leadId) return;

    setIsMarkingAsRead(true);
    try {
      console.log('📖 [MARK AS READ] Marking messages as read for lead:', leadId);

      // Update all unread incoming messages for this lead
      const { error } = await supabase
        .from('conversations')
        .update({ read_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('direction', 'in')
        .is('read_at', null);

      if (error) {
        console.error('❌ [MARK AS READ] Error:', error);
        throw error;
      }

      console.log('✅ [MARK AS READ] Successfully marked messages as read');
      
      // Trigger global unread count refresh
      console.log('🔄 [MARK AS READ] Triggering global unread count refresh');
      window.dispatchEvent(new CustomEvent('unread-count-changed'));
      
      toast({
        title: "Messages marked as read",
        description: "All unread messages have been marked as read",
      });

    } catch (error) {
      console.error('❌ [MARK AS READ] Failed:', error);
      toast({
        title: "Error",
        description: "Failed to mark messages as read",
        variant: "destructive"
      });
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  return { markAsRead, isMarkingAsRead };
};
