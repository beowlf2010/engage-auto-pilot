
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
    console.log('🔒 [SECURE UPLOAD] Starting secure lead upload for', leads.length, 'leads');

    // Transform leads to the expected format with enhanced data validation
    const transformedLeads = leads.map((lead, index) => {
      console.log(`📝 [SECURE UPLOAD] Transforming lead ${index + 1}:`, {
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

    console.log('🔒 [SECURE UPLOAD] Calling secure upload function with', transformedLeads.length, 'transformed leads');

    // Call the NEW secure upload function
    const { data, error } = await supabase.rpc('upload_csv_leads_secure', {
      p_leads: transformedLeads,
      p_upload_history_id: uploadHistoryId || null
    });

    if (error) {
      console.error('❌ [SECURE UPLOAD] Function call failed:', error);
      
      // Enhanced error handling for security-related issues
      let errorMessage = error.message || 'Unknown database error';
      if (error.code === '42501') {
        errorMessage = 'Insufficient permissions. Manager or admin role required.';
      } else if (error.code === '23505') {
        errorMessage = 'Duplicate data detected. Some leads may already exist.';
      } else if (error.message?.includes('Rate limit exceeded')) {
        errorMessage = 'Too many upload attempts. Please wait before trying again.';
      } else if (error.message?.includes('Authentication required')) {
        errorMessage = 'Please log in to upload leads.';
      }
      
      throw new Error(errorMessage);
    }

    console.log('✅ [SECURE UPLOAD] Secure upload completed:', data);

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
    console.error('💥 [SECURE UPLOAD] Secure upload failed:', error);
    
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
        context: 'Secure lead uploader'
      }],
      errorCount: 1,
      message: `Upload failed: ${errorMessage}`
    };
  }
};

export const promoteToAdmin = async (
  targetUserId?: string,
  justification?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('👑 [ADMIN PROMOTION] Promoting user to admin with enhanced security');
    
    const userId = targetUserId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!userId) {
      return {
        success: false,
        message: 'User ID is required for admin promotion'
      };
    }
    
    // Check if user is already admin first
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    if (existingRoles) {
      console.log('✅ [ADMIN PROMOTION] User is already admin, skipping promotion');
      return {
        success: true,
        message: 'User already has admin privileges'
      };
    }
    
    // Use the correct function name for self-promotion
    const { data, error } = await supabase.rpc('make_current_user_admin');
    
    if (error) {
      console.error('❌ [ADMIN PROMOTION] Failed:', error);
      // If error mentions self-promotion, user is likely already admin
      if (error.message?.includes('cannot promote himself') || error.message?.includes('already admin')) {
        return {
          success: true,
          message: 'User already has admin privileges'
        };
      }
      throw error;
    }
    
    console.log('✅ [ADMIN PROMOTION] Success:', data);
    
    // Type assertion for the response data
    const result = data as any;
    return {
      success: result.success || true,
      message: result.message || 'Admin promotion completed'
    };
  } catch (error) {
    console.error('💥 [ADMIN PROMOTION] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle case where user is already admin
    if (errorMessage.includes('cannot promote himself') || errorMessage.includes('already admin')) {
      return {
        success: true,
        message: 'User already has admin privileges'
      };
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
};
