import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { soldCustomerService } from './soldCustomerService';

export interface SoldCustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  source: string;
  uploadedAt: string;
  assignedToPostSale: boolean;
  vehicleInterest: string;
}

export interface SoldCustomerUploadSummary {
  totalSoldCustomers: number;
  soldCustomersData: SoldCustomerData[];
  postSaleAssignments: number;
  duplicateSoldCustomers: number;
}

class SoldCustomerTracker {
  /**
   * Identify sold customers from processed leads
   */
  identifySoldCustomers(leads: ProcessedLead[]): ProcessedLead[] {
    return leads.filter(lead => lead.status === 'sold');
  }

  /**
   * Track sold customers in upload history
   */
  async trackSoldCustomersInUpload(
    uploadHistoryId: string,
    soldCustomers: ProcessedLead[]
  ): Promise<SoldCustomerUploadSummary> {
    try {
      const soldCustomersData: SoldCustomerData[] = soldCustomers.map(customer => ({
        firstName: customer.firstName,
        lastName: customer.lastName,
        source: customer.source,
        uploadedAt: new Date().toISOString(),
        assignedToPostSale: false,
        vehicleInterest: customer.vehicleInterest
      }));

      // Update upload history with sold customer data
      const { error: updateError } = await supabase
        .from('upload_history')
        .update({
          sold_customers_count: soldCustomers.length,
          sold_customers_data: soldCustomersData as any
        })
        .eq('id', uploadHistoryId);

      if (updateError) {
        console.error('Error updating upload history with sold customers:', updateError);
        throw updateError;
      }

      console.log(`✅ [SOLD TRACKER] Tracked ${soldCustomers.length} sold customers in upload ${uploadHistoryId}`);

      return {
        totalSoldCustomers: soldCustomers.length,
        soldCustomersData,
        postSaleAssignments: 0, // Will be updated after post-sale assignment
        duplicateSoldCustomers: 0 // Will be calculated separately
      };
    } catch (error) {
      console.error('Error tracking sold customers:', error);
      throw error;
    }
  }

  /**
   * Automatically assign sold customers to post-sale processes
   */
  async assignSoldCustomersToPostSale(uploadHistoryId: string): Promise<number> {
    try {
      // Get sold customer leads from the database that were just uploaded
      const { data: soldLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, source')
        .eq('upload_history_id', uploadHistoryId)
        .eq('status', 'sold');

      if (leadsError) {
        console.error('Error fetching sold leads:', leadsError);
        return 0;
      }

      if (!soldLeads || soldLeads.length === 0) {
        console.log('No sold customers found in upload to assign to post-sale');
        return 0;
      }

      // Use existing sold customer service to auto-assign
      const result = await soldCustomerService.autoAssignSoldCustomers();
      const assignedCount = result.assigned;

      // Update upload history with post-sale assignment count
      if (assignedCount > 0) {
        const { error: updateError } = await supabase
          .from('upload_history')
          .update({
            post_sale_assignments_made: assignedCount
          })
          .eq('id', uploadHistoryId);

        if (updateError) {
          console.error('Error updating post-sale assignments count:', updateError);
        }

        // Update sold customers data to mark as assigned
        const { data: uploadHistory } = await supabase
          .from('upload_history')
          .select('sold_customers_data')
          .eq('id', uploadHistoryId)
          .single();

        if (uploadHistory?.sold_customers_data) {
          const updatedData = (uploadHistory.sold_customers_data as unknown as SoldCustomerData[]).map(customer => ({
            ...customer,
            assignedToPostSale: true
          }));

          await supabase
            .from('upload_history')
            .update({
              sold_customers_data: updatedData as any
            })
            .eq('id', uploadHistoryId);
        }
      }

      console.log(`✅ [SOLD TRACKER] Assigned ${assignedCount} sold customers to post-sale processes`);
      return assignedCount;
    } catch (error) {
      console.error('Error assigning sold customers to post-sale:', error);
      return 0;
    }
  }

  /**
   * Get sold customer summary for an upload
   */
  async getSoldCustomerSummary(uploadHistoryId: string): Promise<SoldCustomerUploadSummary | null> {
    try {
      const { data: uploadHistory, error } = await supabase
        .from('upload_history')
        .select('sold_customers_count, sold_customers_data, post_sale_assignments_made')
        .eq('id', uploadHistoryId)
        .single();

      if (error || !uploadHistory) {
        console.error('Error fetching sold customer summary:', error);
        return null;
      }

      return {
        totalSoldCustomers: uploadHistory.sold_customers_count || 0,
        soldCustomersData: (uploadHistory.sold_customers_data as unknown as SoldCustomerData[]) || [],
        postSaleAssignments: uploadHistory.post_sale_assignments_made || 0,
        duplicateSoldCustomers: 0 // TODO: Track duplicates separately
      };
    } catch (error) {
      console.error('Error getting sold customer summary:', error);
      return null;
    }
  }

  /**
   * Get recent sold customer uploads
   */
  async getRecentSoldCustomerUploads(days: number = 7): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data: uploads, error } = await supabase
        .from('upload_history')
        .select(`
          id,
          original_filename,
          created_at,
          sold_customers_count,
          sold_customers_data,
          post_sale_assignments_made
        `)
        .gte('created_at', cutoffDate.toISOString())
        .gt('sold_customers_count', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recent sold customer uploads:', error);
        return [];
      }

      return uploads || [];
    } catch (error) {
      console.error('Error getting recent sold customer uploads:', error);
      return [];
    }
  }
}

export const soldCustomerTracker = new SoldCustomerTracker();