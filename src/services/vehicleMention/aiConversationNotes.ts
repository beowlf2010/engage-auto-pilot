
import { supabase } from '@/integrations/supabase/client';
import { AIConversationNote } from './types';

// Add AI conversation note
export const addAIConversationNote = async (
  leadId: string,
  conversationId: string | null,
  noteType: AIConversationNote['note_type'],
  noteContent: string,
  vehiclesDiscussed: any[] = []
) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        conversation_id: conversationId,
        note_type: noteType,
        note_content: noteContent,
        vehicles_discussed: vehiclesDiscussed
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding AI conversation note:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in addAIConversationNote:', error);
    return null;
  }
};

// Get AI conversation notes for a lead
export const getLeadAIConversationNotes = async (leadId: string) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversation_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching AI conversation notes:', error);
      return [];
    }

    return data as AIConversationNote[];
  } catch (error) {
    console.error('Error in getLeadAIConversationNotes:', error);
    return [];
  }
};
