
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';

export interface DuplicateCheckResult {
  uniqueLeads: ProcessedLead[];
  duplicateLeads: Array<{
    lead: ProcessedLead;
    duplicateType: 'phone' | 'email' | 'name';
    existingLeadInfo: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      primaryPhone?: string;
    };
    rowIndex: number;
  }>;
  checkSummary: {
    totalProcessed: number;
    uniqueCount: number;
    duplicateCount: number;
    phoneMatches: number;
    emailMatches: number;
    nameMatches: number;
  };
}

// Enhanced phone number normalization
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
};

// Enhanced email normalization
const normalizeEmail = (email: string): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Enhanced name normalization
const normalizeName = (first: string, last: string): string => {
  if (!first || !last) return '';
  return `${first.toLowerCase().trim()}_${last.toLowerCase().trim()}`;
};

export const checkForDatabaseDuplicates = async (
  leads: ProcessedLead[]
): Promise<DuplicateCheckResult> => {
  console.log(`🔍 [DUPLICATE CHECKER] Starting database duplicate check for ${leads.length} leads`);
  
  const uniqueLeads: ProcessedLead[] = [];
  const duplicateLeads: DuplicateCheckResult['duplicateLeads'] = [];
  let phoneMatches = 0;
  let emailMatches = 0;
  let nameMatches = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const rowIndex = i + 1;
    let isDuplicate = false;
    
    console.log(`🔍 [DUPLICATE CHECKER] Checking lead ${rowIndex}: ${lead.firstName} ${lead.lastName}`);

    // Check for phone duplicates
    if (!isDuplicate && lead.phoneNumbers && lead.phoneNumbers.length > 0) {
      for (const phoneObj of lead.phoneNumbers) {
        const normalizedPhone = normalizePhoneNumber(phoneObj.number);
        if (normalizedPhone) {
          const { data: phoneExists } = await supabase
            .from('phone_numbers')
            .select(`
              id,
              leads!inner(
                id,
                first_name,
                last_name,
                email
              )
            `)
            .eq('number', phoneObj.number)
            .limit(1);
          
          if (phoneExists && phoneExists.length > 0) {
            const existingLead = phoneExists[0].leads;
            duplicateLeads.push({
              lead,
              duplicateType: 'phone',
              existingLeadInfo: {
                id: existingLead.id,
                firstName: existingLead.first_name || 'Unknown',
                lastName: existingLead.last_name || 'Unknown',
                email: existingLead.email || undefined,
                primaryPhone: phoneObj.number
              },
              rowIndex
            });
            
            phoneMatches++;
            isDuplicate = true;
            console.log(`📞 [DUPLICATE CHECKER] Phone duplicate found for lead ${rowIndex}: ${phoneObj.number}`);
            break;
          }
        }
      }
    }

    // Check for email duplicates
    if (!isDuplicate && lead.email) {
      const normalizedEmail = normalizeEmail(lead.email);
      const { data: emailExists } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .eq('email', normalizedEmail)
        .limit(1);
      
      if (emailExists && emailExists.length > 0) {
        const existingLead = emailExists[0];
        duplicateLeads.push({
          lead,
          duplicateType: 'email',
          existingLeadInfo: {
            id: existingLead.id,
            firstName: existingLead.first_name || 'Unknown',
            lastName: existingLead.last_name || 'Unknown',
            email: existingLead.email || undefined
          },
          rowIndex
        });
        
        emailMatches++;
        isDuplicate = true;
        console.log(`📧 [DUPLICATE CHECKER] Email duplicate found for lead ${rowIndex}: ${lead.email}`);
      }
    }

    // Check for name duplicates (only if both first and last name exist)
    if (!isDuplicate && lead.firstName && lead.lastName) {
      const { data: nameExists } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .eq('first_name', lead.firstName)
        .eq('last_name', lead.lastName)
        .limit(1);
      
      if (nameExists && nameExists.length > 0) {
        const existingLead = nameExists[0];
        duplicateLeads.push({
          lead,
          duplicateType: 'name',
          existingLeadInfo: {
            id: existingLead.id,
            firstName: existingLead.first_name || 'Unknown',
            lastName: existingLead.last_name || 'Unknown',
            email: existingLead.email || undefined
          },
          rowIndex
        });
        
        nameMatches++;
        isDuplicate = true;
        console.log(`👤 [DUPLICATE CHECKER] Name duplicate found for lead ${rowIndex}: ${lead.firstName} ${lead.lastName}`);
      }
    }

    // If no duplicates found, add to unique leads
    if (!isDuplicate) {
      uniqueLeads.push(lead);
      console.log(`✅ [DUPLICATE CHECKER] Lead ${rowIndex} is unique, will be uploaded`);
    }
  }

  const checkSummary = {
    totalProcessed: leads.length,
    uniqueCount: uniqueLeads.length,
    duplicateCount: duplicateLeads.length,
    phoneMatches,
    emailMatches,
    nameMatches
  };

  console.log(`🎯 [DUPLICATE CHECKER] Check completed:`, checkSummary);

  return {
    uniqueLeads,
    duplicateLeads,
    checkSummary
  };
};
