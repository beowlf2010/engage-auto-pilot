
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

      // Pre-check: how many unread exist right now
      const { count: preCount, error: preCountError } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', leadId)
        .eq('direction', 'in')
        .is('read_at', null);

      if (preCountError) {
        console.warn('⚠️ [MARK AS READ] Pre-count failed:', preCountError);
      }

      // Update all unread incoming messages for this lead and return affected rows
      const { data: updatedRows, error } = await supabase
        .from('conversations')
        .update({ read_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('direction', 'in')
        .is('read_at', null)
        .select('id');

      if (error) {
        console.error('❌ [MARK AS READ] Error:', error);
        throw error;
      }

      const rowsUpdated = updatedRows?.length || 0;
      console.log(`✅ [MARK AS READ] Updated ${rowsUpdated} messages (preCount=${preCount ?? 'unknown'})`);

      // Verify remaining unread after update
      const { count: remaining, error: postCountError } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', leadId)
        .eq('direction', 'in')
        .is('read_at', null);

      if (postCountError) {
        console.warn('⚠️ [MARK AS READ] Post-count failed:', postCountError);
      }

      // Trigger global unread count refresh
      console.log('🔄 [MARK AS READ] Triggering global unread count refresh');
      window.dispatchEvent(new CustomEvent('unread-count-changed'));

      if ((remaining ?? 0) > 0) {
        console.warn(`⚠️ [MARK AS READ] ${remaining} messages remain unread for lead ${leadId}`);
        toast({
          title: 'Some messages could not be marked read',
          description: `${remaining} message(s) remain unread. You may not have permission for all messages.`,
        });
      } else {
        toast({
          title: 'Messages marked as read',
          description: 'All unread messages have been marked as read',
        });
      }

      

    } catch (error) {
      console.error('❌ [MARK AS READ] Failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark messages as read',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  return { markAsRead, isMarkingAsRead };
};
