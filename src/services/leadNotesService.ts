
import { supabase } from '@/integrations/supabase/client';

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const fetchLeadNotes = async (leadId: string): Promise<LeadNote[]> => {
  const { data, error } = await supabase
    .from('lead_notes')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lead notes:', error);
    throw error;
  }

  return data || [];
};

export const createLeadNote = async (leadId: string, content: string): Promise<LeadNote> => {
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({
      lead_id: leadId,
      content,
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .single();

  if (error) {
    console.error('Error creating lead note:', error);
    throw error;
  }

  return data;
};

export const updateLeadNote = async (noteId: string, content: string): Promise<LeadNote> => {
  const { data, error } = await supabase
    .from('lead_notes')
    .update({ content })
    .eq('id', noteId)
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .single();

  if (error) {
    console.error('Error updating lead note:', error);
    throw error;
  }

  return data;
};

export const deleteLeadNote = async (noteId: string): Promise<void> => {
  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting lead note:', error);
    throw error;
  }
};
