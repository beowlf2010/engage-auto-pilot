
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';

export const checkExistingDuplicates = async (leads: ProcessedLead[]): Promise<Array<{
  leadData: ProcessedLead;
  duplicateType: 'phone' | 'email' | 'name';
  rowIndex: number;
}>> => {
  const duplicates: Array<{
    leadData: ProcessedLead;
    duplicateType: 'phone' | 'email' | 'name';
    rowIndex: number;
  }> = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    // Check for phone duplicates
    if (lead.primaryPhone) {
      const { data: phoneExists } = await supabase
        .from('phone_numbers')
        .select('id')
        .eq('number', lead.primaryPhone)
        .limit(1);
      
      if (phoneExists && phoneExists.length > 0) {
        duplicates.push({
          leadData: lead,
          duplicateType: 'phone',
          rowIndex: i + 1
        });
        continue;
      }
    }

    // Check for email duplicates
    if (lead.email) {
      const { data: emailExists } = await supabase
        .from('leads')
        .select('id')
        .eq('email', lead.email)
        .limit(1);
      
      if (emailExists && emailExists.length > 0) {
        duplicates.push({
          leadData: lead,
          duplicateType: 'email',
          rowIndex: i + 1
        });
        continue;
      }
    }

    // Check for name duplicates
    if (lead.firstName && lead.lastName) {
      const { data: nameExists } = await supabase
        .from('leads')
        .select('id')
        .eq('first_name', lead.firstName)
        .eq('last_name', lead.lastName)
        .limit(1);
      
      if (nameExists && nameExists.length > 0) {
        duplicates.push({
          leadData: lead,
          duplicateType: 'name',
          rowIndex: i + 1
        });
        continue;
      }
    }
  }

  return duplicates;
};
