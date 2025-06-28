import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CleanupResult {
  success: boolean;
  duplicatesFound: number;
  duplicatesRemoved: number;
  errors: Array<{
    leadId: string;
    error: string;
  }>;
}

// Enhanced phone number normalization for cleanup
const normalizePhoneForCleanup = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
};

export const cleanupDuplicateLeads = async (): Promise<CleanupResult> => {
  try {
    console.log('🧹 [CLEANUP] Starting duplicate lead cleanup...');
    
    const result: CleanupResult = {
      success: true,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      errors: []
    };

    // Find phone number duplicates
    const { data: phoneLeads, error: phoneError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        email,
        created_at,
        phone_numbers!inner(number)
      `)
      .order('created_at', { ascending: true });

    if (phoneError) throw phoneError;

    // Group leads by normalized phone number
    const phoneGroups = new Map<string, any[]>();
    
    phoneLeads?.forEach(lead => {
      lead.phone_numbers.forEach((phone: any) => {
        const normalized = normalizePhoneForCleanup(phone.number);
        if (normalized) {
          if (!phoneGroups.has(normalized)) {
            phoneGroups.set(normalized, []);
          }
          phoneGroups.get(normalized)?.push(lead);
        }
      });
    });

    // Find email duplicates
    const { data: emailLeads, error: emailError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, created_at')
      .not('email', 'is', null)
      .order('created_at', { ascending: true });

    if (emailError) throw emailError;

    const emailGroups = new Map<string, any[]>();
    emailLeads?.forEach(lead => {
      const normalizedEmail = lead.email.toLowerCase().trim();
      if (!emailGroups.has(normalizedEmail)) {
        emailGroups.set(normalizedEmail, []);
      }
      emailGroups.get(normalizedEmail)?.push(lead);
    });

    // Find name duplicates
    const { data: nameLeads, error: nameError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, created_at')
      .not('first_name', 'is', null)
      .not('last_name', 'is', null)
      .order('created_at', { ascending: true });

    if (nameError) throw nameError;

    const nameGroups = new Map<string, any[]>();
    nameLeads?.forEach(lead => {
      const nameKey = `${lead.first_name.toLowerCase().trim()}_${lead.last_name.toLowerCase().trim()}`;
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      nameGroups.get(nameKey)?.push(lead);
    });

    // Collect leads to delete (keep the oldest one in each group)
    const leadsToDelete = new Set<string>();

    // Process phone duplicates
    phoneGroups.forEach((leads, phone) => {
      if (leads.length > 1) {
        const uniqueLeads = Array.from(new Set(leads.map(l => l.id)))
          .map(id => leads.find(l => l.id === id));
        
        // Keep the oldest, mark others for deletion
        uniqueLeads.slice(1).forEach(lead => {
          leadsToDelete.add(lead.id);
        });
        
        result.duplicatesFound += uniqueLeads.length - 1;
      }
    });

    // Process email duplicates
    emailGroups.forEach((leads, email) => {
      if (leads.length > 1) {
        // Keep the oldest, mark others for deletion
        leads.slice(1).forEach(lead => {
          leadsToDelete.add(lead.id);
        });
        
        result.duplicatesFound += leads.length - 1;
      }
    });

    // Process name duplicates (only if not already marked from phone/email)
    nameGroups.forEach((leads, name) => {
      if (leads.length > 1) {
        const newDuplicates = leads.slice(1).filter(lead => !leadsToDelete.has(lead.id));
        newDuplicates.forEach(lead => {
          leadsToDelete.add(lead.id);
        });
        
        result.duplicatesFound += newDuplicates.length;
      }
    });

    console.log(`🧹 [CLEANUP] Found ${leadsToDelete.size} duplicate leads to remove`);

    // Delete duplicate leads in batches
    const leadsArray = Array.from(leadsToDelete);
    const batchSize = 100;
    
    for (let i = 0; i < leadsArray.length; i += batchSize) {
      const batch = leadsArray.slice(i, i + batchSize);
      
      try {
        // Delete phone numbers first (foreign key constraint)
        const { error: phoneDeleteError } = await supabase
          .from('phone_numbers')
          .delete()
          .in('lead_id', batch);

        if (phoneDeleteError) {
          console.error('Error deleting phone numbers:', phoneDeleteError);
        }

        // Delete leads
        const { error: leadDeleteError } = await supabase
          .from('leads')
          .delete()
          .in('id', batch);

        if (leadDeleteError) {
          batch.forEach(leadId => {
            result.errors.push({
              leadId,
              error: leadDeleteError.message
            });
          });
        } else {
          result.duplicatesRemoved += batch.length;
        }
      } catch (error) {
        console.error(`Error deleting batch:`, error);
        batch.forEach(leadId => {
          result.errors.push({
            leadId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }
    }

    console.log(`✅ [CLEANUP] Cleanup completed: ${result.duplicatesRemoved} duplicates removed`);
    
    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    console.error('💥 [CLEANUP] Critical cleanup error:', error);
    return {
      success: false,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      errors: [{
        leadId: 'system',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    };
  }
};
