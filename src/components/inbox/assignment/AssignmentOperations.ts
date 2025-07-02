import { supabase } from '@/integrations/supabase/client';

export const quickAssignLead = async (leadId: string, salespersonId: string) => {
  const { error } = await supabase
    .from('leads')
    .update({ salesperson_id: salespersonId })
    .eq('id', leadId);

  if (error) throw error;
};

export const bulkAssignLeads = async (leadIds: string[], salespersonId: string) => {
  const { error } = await supabase
    .from('leads')
    .update({ salesperson_id: salespersonId })
    .in('id', leadIds);

  if (error) throw error;
};

export const autoAssignLeads = async (
  leadIds: string[], 
  salespeople: Array<{ id: string; activeLeads: number }>
) => {
  const sortedSalespeople = [...salespeople].sort((a, b) => a.activeLeads - b.activeLeads);
  
  const assignments = leadIds.map((leadId, index) => {
    const salesperson = sortedSalespeople[index % sortedSalespeople.length];
    return { leadId, salespersonId: salesperson.id };
  });

  for (const assignment of assignments) {
    const { error } = await supabase
      .from('leads')
      .update({ salesperson_id: assignment.salespersonId })
      .eq('id', assignment.leadId);
    
    if (error) throw error;
  }
};