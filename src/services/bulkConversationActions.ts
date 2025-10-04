import { supabase } from '@/integrations/supabase/client';

export class BulkConversationActions {
  async markMultipleAsRead(leadIds: string[]): Promise<void> {
    if (leadIds.length === 0) return;

    console.log('📝 [BULK] Marking conversations as read:', leadIds.length);

    const { error } = await supabase
      .from('conversations')
      .update({ read_at: new Date().toISOString() })
      .in('lead_id', leadIds)
      .is('read_at', null)
      .eq('direction', 'in');

    if (error) {
      console.error('❌ [BULK] Error marking as read:', error);
      throw new Error('Failed to mark conversations as read');
    }

    console.log('✅ [BULK] Marked conversations as read');
  }

  async assignMultiple(leadIds: string[], userId: string): Promise<void> {
    if (leadIds.length === 0) return;

    console.log('👤 [BULK] Assigning leads:', leadIds.length, 'to user:', userId);

    const { error } = await supabase
      .from('leads')
      .update({ salesperson_id: userId })
      .in('id', leadIds);

    if (error) {
      console.error('❌ [BULK] Error assigning leads:', error);
      throw new Error('Failed to assign leads');
    }

    console.log('✅ [BULK] Assigned leads');
  }

  async toggleAI(leadIds: string[], enabled: boolean): Promise<void> {
    if (leadIds.length === 0) return;

    console.log('🤖 [BULK] Toggling AI for leads:', leadIds.length, 'enabled:', enabled);

    const { error } = await supabase
      .from('leads')
      .update({ 
        ai_opt_in: enabled,
        ai_sequence_paused: !enabled 
      })
      .in('id', leadIds);

    if (error) {
      console.error('❌ [BULK] Error toggling AI:', error);
      throw new Error('Failed to toggle AI');
    }

    console.log('✅ [BULK] Toggled AI');
  }

  async deleteMultiple(leadIds: string[]): Promise<void> {
    if (leadIds.length === 0) return;

    console.log('🗑️ [BULK] Deleting leads:', leadIds.length);

    // First delete conversations
    const { error: convError } = await supabase
      .from('conversations')
      .delete()
      .in('lead_id', leadIds);

    if (convError) {
      console.error('❌ [BULK] Error deleting conversations:', convError);
      throw new Error('Failed to delete conversations');
    }

    // Then delete leads
    const { error: leadError } = await supabase
      .from('leads')
      .delete()
      .in('id', leadIds);

    if (leadError) {
      console.error('❌ [BULK] Error deleting leads:', leadError);
      throw new Error('Failed to delete leads');
    }

    console.log('✅ [BULK] Deleted leads and conversations');
  }
}

export const bulkConversationActions = new BulkConversationActions();
