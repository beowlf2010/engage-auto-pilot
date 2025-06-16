
import { supabase } from '@/integrations/supabase/client';
import { VINMessageExport } from './types';

export const createMessageExport = async (
  exportName: string, 
  exportData: VINMessageExport
) => {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User must be authenticated to create message exports');
    }

    const { data, error } = await supabase
      .from('message_exports')
      .insert({
        export_name: exportName,
        source_system: 'vin',
        total_messages: exportData.export_info.total_messages,
        total_leads: exportData.export_info.total_leads,
        export_data: exportData as any,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating message export:', error);
    throw error;
  }
};

export const getMessageExports = async () => {
  try {
    const { data, error } = await supabase
      .from('message_exports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching message exports:', error);
    return [];
  }
};
