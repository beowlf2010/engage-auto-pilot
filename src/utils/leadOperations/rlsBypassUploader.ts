
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';

export interface BypassUploadResult {
  success: boolean;
  totalProcessed: number;
  successfulInserts: number;
  errors: any[];
  errorCount?: number;
  message: string;
  timestamp?: string;
}

export const uploadLeadsWithRLSBypass = async (
  leads: ProcessedLead[],
  uploadHistoryId?: string
): Promise<BypassUploadResult> => {
  try {
    console.log('🚀 [SUPABASE BYPASS] Starting Supabase-compatible RLS bypass upload for', leads.length, 'leads');

    // Transform leads to the expected format with enhanced data validation
    const transformedLeads = leads.map((lead, index) => {
      console.log(`📝 [SUPABASE BYPASS] Transforming lead ${index + 1}:`, {
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        phoneCount: lead.phoneNumbers?.length || 0
      });

      return {
        firstName: lead.firstName || null,
        lastName: lead.lastName || null,
        middleName: lead.middleName || null,
        email: lead.email || null,
        emailAlt: lead.emailAlt || null,
        address: lead.address || null,
        city: lead.city || null,
        state: lead.state || null,
        postalCode: lead.postalCode || null,
        vehicleInterest: lead.vehicleInterest || 'finding the right vehicle for your needs',
        vehicleVIN: lead.vehicleVIN || null,
        source: lead.source || 'CSV Import',
        status: lead.status || 'new',
        doNotCall: Boolean(lead.doNotCall),
        doNotEmail: Boolean(lead.doNotEmail),
        doNotMail: Boolean(lead.doNotMail),
        salesPersonName: lead.salesPersonName || null,
        leadStatusTypeName: lead.leadStatusTypeName || null,
        leadTypeName: lead.leadTypeName || null,
        leadSourceName: lead.leadSourceName || null,
        phoneNumbers: (lead.phoneNumbers || []).map(phone => ({
          number: phone.number,
          type: phone.type || 'mobile',
          priority: phone.priority || 1,
          status: phone.status || 'active',
          isPrimary: Boolean(phone.isPrimary)
        }))
      };
    });

    console.log('🔄 [SUPABASE BYPASS] Calling Supabase-compatible bypass function with', transformedLeads.length, 'transformed leads');

    // Call the updated Supabase-compatible bypass function
    const { data, error } = await supabase.rpc('upload_csv_leads_bypass_rls', {
      p_leads: transformedLeads,
      p_upload_history_id: uploadHistoryId || null
    });

    if (error) {
      console.error('❌ [SUPABASE BYPASS] Function call failed:', error);
      
      // Enhanced error handling for common Supabase issues
      let errorMessage = error.message || 'Unknown database error';
      if (error.code === '42501') {
        errorMessage = 'Database permission error. Please contact administrator.';
      } else if (error.code === '23505') {
        errorMessage = 'Duplicate data detected. Some leads may already exist.';
      }
      
      throw new Error(errorMessage);
    }

    console.log('✅ [SUPABASE BYPASS] Supabase-compatible bypass upload completed:', data);

    // Type assertion and enhanced result processing
    const result = data as any;

    return {
      success: result.success || false,
      totalProcessed: result.totalProcessed || 0,
      successfulInserts: result.successfulInserts || 0,
      errors: result.errors || [],
      errorCount: result.errorCount || 0,
      message: result.message || 'Upload completed',
      timestamp: result.timestamp
    };

  } catch (error) {
    console.error('💥 [SUPABASE BYPASS] Supabase-compatible bypass upload failed:', error);
    
    // Enhanced error handling with more details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error && 'details' in error ? (error as any).details : null;
    
    return {
      success: false,
      totalProcessed: 0,
      successfulInserts: 0,
      errors: [{
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        context: 'Supabase RLS bypass uploader'
      }],
      errorCount: 1,
      message: `Upload failed: ${errorMessage}`
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
      success: result.success || false,
      message: result.message || 'Admin promotion completed'
    };
  } catch (error) {
    console.error('💥 [ADMIN PROMOTION] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
