
import { supabase } from '@/integrations/supabase/client';
import { leadProcessService } from './leadProcessService';
import { initializePostSaleProcesses } from './postSaleProcesses';

class SoldCustomerService {
  // Detect leads that are sold customers
  async getSoldCustomerLeads(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .or('source.ilike.%sold%,status.eq.closed')
        .eq('ai_opt_in', false); // Only get those not already in AI processes

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sold customer leads:', error);
      return [];
    }
  }

  // Auto-assign sold customers to post-sale follow-up process
  async autoAssignSoldCustomers(): Promise<{ assigned: number; errors: any[] }> {
    try {
      // Ensure post-sale process exists
      await initializePostSaleProcesses();

      // Get all available processes and find the post-sale one
      const processes = await leadProcessService.getLeadProcesses();
      const postSaleProcess = processes.find(p => 
        p.name === 'Post-Sale Customer Follow-Up'
      );

      if (!postSaleProcess) {
        throw new Error('Post-Sale Customer Follow-Up process not found');
      }

      // Get sold customer leads
      const soldLeads = await this.getSoldCustomerLeads();
      
      let assignedCount = 0;
      const errors: any[] = [];

      // Assign each sold customer to the post-sale process
      for (const lead of soldLeads) {
        try {
          const assignment = await leadProcessService.assignLeadToProcess(
            lead.id.toString(),
            postSaleProcess.id
          );
          
          if (assignment) {
            assignedCount++;
            
            // Also enable AI opt-in for these leads with a gentle setting
            await supabase
              .from('leads')
              .update({ 
                ai_opt_in: true,
                ai_stage: 'ready_for_contact',
                message_intensity: 'gentle',
                ai_strategy_bucket: 'referral_repeat',
                ai_aggression_level: 1
              })
              .eq('id', lead.id);
          }
        } catch (error) {
          errors.push({ leadId: lead.id, error: error.message });
        }
      }

      return { assigned: assignedCount, errors };
    } catch (error) {
      console.error('Error auto-assigning sold customers:', error);
      return { assigned: 0, errors: [{ general: error.message }] };
    }
  }

  // Check if a lead qualifies as a sold customer
  isSoldCustomer(lead: any): boolean {
    const soldSources = ['sold', 'purchase', 'delivered'];
    const source = lead.source?.toLowerCase() || '';
    
    return soldSources.some(s => source.includes(s)) || 
           lead.status === 'closed' ||
           lead.ai_pause_reason === 'marked_sold';
  }
}

export const soldCustomerService = new SoldCustomerService();
