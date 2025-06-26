
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';

export interface BypassUploadResult {
  success: boolean;
  totalProcessed: number;
  successfulInserts: number;
  errors: any[];
  message: string;
}

export const uploadLeadsWithRLSBypass = async (
  leads: ProcessedLead[],
  uploadHistoryId?: string
): Promise<BypassUploadResult> => {
  try {
    console.log('🚀 [BYPASS UPLOADER] Starting RLS bypass upload for', leads.length, 'leads');

    // Transform leads to the expected format
    const transformedLeads = leads.map(lead => ({
      firstName: lead.firstName,
      lastName: lead.lastName,
      middleName: lead.middleName,
      email: lead.email,
      emailAlt: lead.emailAlt,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      postalCode: lead.postalCode,
      vehicleInterest: lead.vehicleInterest,
      vehicleVIN: lead.vehicleVIN,
      source: lead.source,
      status: lead.status,
      doNotCall: lead.doNotCall,
      doNotEmail: lead.doNotEmail,
      doNotMail: lead.doNotMail,
      salesPersonName: lead.salesPersonName,
      leadStatusTypeName: lead.leadStatusTypeName,
      leadTypeName: lead.leadTypeName,
      leadSourceName: lead.leadSourceName,
      phoneNumbers: lead.phoneNumbers.map(phone => ({
        number: phone.number,
        type: phone.type,
        priority: phone.priority,
        status: phone.status || 'active',
        isPrimary: phone.isPrimary || false
      }))
    }));

    // Call the bypass function
    const { data, error } = await supabase.rpc('upload_csv_leads_bypass_rls', {
      p_leads: transformedLeads,
      p_upload_history_id: uploadHistoryId || null
    });

    if (error) {
      console.error('❌ [BYPASS UPLOADER] Function call failed:', error);
      throw error;
    }

    console.log('✅ [BYPASS UPLOADER] Upload completed:', data);

    // Type assertion for the response data
    const result = data as any;

    return {
      success: result.success,
      totalProcessed: result.totalProcessed,
      successfulInserts: result.successfulInserts,
      errors: result.errors || [],
      message: result.message
    };

  } catch (error) {
    console.error('💥 [BYPASS UPLOADER] Upload failed:', error);
    return {
      success: false,
      totalProcessed: 0,
      successfulInserts: 0,
      errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
      message: 'Upload failed with error'
    };
  }
};

export const promoteToAdmin = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('👑 [ADMIN PROMOTION] Promoting current user to admin');
    
    const { data, error } = await supabase.rpc('make_current_user_admin');
    
    if (error) {
      console.error('❌ [ADMIN PROMOTION] Failed:', error);
      throw error;
    }
    
    console.log('✅ [ADMIN PROMOTION] Success:', data);
    
    // Type assertion for the response data
    const result = data as any;
    return {
      success: result.success,
      message: result.message
    };
  } catch (error) {
    console.error('💥 [ADMIN PROMOTION] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
