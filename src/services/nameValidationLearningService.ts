
import { supabase } from '@/integrations/supabase/client';

export interface LearnedNameValidation {
  isValidPersonalName: boolean;
  confidence: number;
  detectedType: 'personal' | 'city' | 'state' | 'business' | 'generic' | 'phone' | 'unknown' | 'learned_override';
  userOverride: boolean;
  timesApproved: number;
  timesRejected: number;
  timesSeen: number;
  suggestions: {
    useGenericGreeting: boolean;
    contextualGreeting?: string;
    leadSourceHint?: string;
  };
}

export const getLearnedNameValidation = async (name: string): Promise<LearnedNameValidation | null> => {
  try {
    // Handle null, undefined, or empty names
    if (!name || typeof name !== 'string') {
      console.log('🚨 [NAME VALIDATION] Invalid name provided:', name);
      return null;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      console.log('🚨 [NAME VALIDATION] Empty name after trimming');
      return null;
    }

    const { data, error } = await supabase
      .from('ai_name_validations')
      .select('*')
      .eq('name_text', trimmedName)
      .maybeSingle();

    if (error) {
      console.error('❌ [NAME VALIDATION] Error fetching learned validation:', error);
      return null;
    }

    if (!data) {
      console.log(`🧠 [NAME VALIDATION] No learned data for "${name}"`);
      return null;
    }

    // Calculate confidence based on decision history
    const totalDecisions = data.times_approved + data.times_denied;
    const approvalRate = totalDecisions > 0 ? data.times_approved / totalDecisions : 0;
    
    return {
      isValidPersonalName: data.times_approved > data.times_denied,
      confidence: Math.min(0.9, 0.5 + (approvalRate * 0.4) + (Math.min(totalDecisions, 10) * 0.05)),
      detectedType: 'learned_override',
      userOverride: true,
      timesApproved: data.times_approved,
      timesRejected: data.times_denied,
      timesSeen: data.times_seen,
      suggestions: {
        useGenericGreeting: data.times_denied > data.times_approved,
        contextualGreeting: data.times_approved > data.times_denied ? `Hi ${name}` : 'Hello there'
      }
    };
  } catch (error) {
    console.error('❌ [NAME VALIDATION] Error checking learned validation:', error);
    return null;
  }
};

/**
 * Batch fetch name validations for multiple names (Performance optimization)
 * Reduces N+1 queries to a single database call
 */
export const getBatchLearnedNameValidations = async (names: string[]): Promise<Map<string, LearnedNameValidation>> => {
  const resultsMap = new Map<string, LearnedNameValidation>();
  
  if (!names || names.length === 0) {
    return resultsMap;
  }

  try {
    // Filter and normalize names
    const validNames = names
      .filter(name => name && typeof name === 'string' && name.trim())
      .map(name => name.trim());

    if (validNames.length === 0) {
      return resultsMap;
    }

    console.log(`🚀 [BATCH NAME VALIDATION] Fetching validations for ${validNames.length} names`);

    // Single batch query using IN clause
    const { data: validations, error } = await supabase
      .from('ai_name_validations')
      .select('*')
      .in('name_text', validNames);

    if (error) {
      console.error('❌ [BATCH NAME VALIDATION] Error fetching batch validations:', error);
      return resultsMap;
    }

    // Process results into map
    if (validations) {
      validations.forEach(data => {
        const totalDecisions = data.times_approved + data.times_denied;
        const approvalRate = totalDecisions > 0 ? data.times_approved / totalDecisions : 0;
        
        resultsMap.set(data.name_text, {
          isValidPersonalName: data.times_approved > data.times_denied,
          confidence: Math.min(0.9, 0.5 + (approvalRate * 0.4) + (Math.min(totalDecisions, 10) * 0.05)),
          detectedType: 'learned_override',
          userOverride: true,
          timesApproved: data.times_approved,
          timesRejected: data.times_denied,
          timesSeen: data.times_seen,
          suggestions: {
            useGenericGreeting: data.times_denied > data.times_approved,
            contextualGreeting: data.times_approved > data.times_denied ? `Hi ${data.name_text}` : 'Hello there'
          }
        });
      });
    }

    console.log(`✅ [BATCH NAME VALIDATION] Retrieved ${resultsMap.size} validations from ${validNames.length} names`);
    return resultsMap;

  } catch (error) {
    console.error('❌ [BATCH NAME VALIDATION] Error in batch validation:', error);
    return resultsMap;
  }
};

export const saveNameValidationDecision = async (
  originalName: string,
  decision: 'approved' | 'denied',
  reason?: string
): Promise<void> => {
  try {
    // Handle null, undefined, or empty names
    if (!originalName || typeof originalName !== 'string') {
      console.error('❌ [NAME VALIDATION] Invalid name provided for decision:', originalName);
      return;
    }

    const name = originalName.trim();
    if (!name) {
      console.error('❌ [NAME VALIDATION] Empty name after trimming');
      return;
    }
    
    const { data: existing } = await supabase
      .from('ai_name_validations')
      .select('*')
      .eq('name_text', name)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const updates = {
        decision,
        decision_reason: reason,
        times_approved: decision === 'approved' ? existing.times_approved + 1 : existing.times_approved,
        times_denied: decision === 'denied' ? existing.times_denied + 1 : existing.times_denied,
        times_seen: existing.times_seen + 1,
        decided_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('ai_name_validations')
        .update(updates)
        .eq('id', existing.id);

      if (error) throw error;
      
      console.log(`✅ [NAME VALIDATION] Updated decision for "${name}": ${decision} (${updates.times_approved}/${updates.times_denied})`);
    } else {
      // Create new record
      const { error } = await supabase
        .from('ai_name_validations')
        .insert({
          name_text: name,
          decision,
          decision_reason: reason,
          times_approved: decision === 'approved' ? 1 : 0,
          times_denied: decision === 'denied' ? 1 : 0,
          times_seen: 1,
          decided_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      
      console.log(`✅ [NAME VALIDATION] Saved new decision for "${name}": ${decision}`);
    }
  } catch (error) {
    console.error('❌ [NAME VALIDATION] Error saving decision:', error);
  }
};

export const saveVehicleValidationDecision = async (
  vehicleText: string,
  decision: 'approved' | 'denied',
  reason?: string
): Promise<void> => {
  try {
    // Handle null, undefined, or empty vehicle text
    if (!vehicleText || typeof vehicleText !== 'string') {
      console.error('❌ [VEHICLE VALIDATION] Invalid vehicle text provided for decision:', vehicleText);
      return;
    }

    const vehicle = vehicleText.trim();
    if (!vehicle) {
      console.error('❌ [VEHICLE VALIDATION] Empty vehicle text after trimming');
      return;
    }
    
    const { data: existing } = await supabase
      .from('ai_vehicle_validations')
      .select('*')
      .eq('vehicle_text', vehicle)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const updates = {
        decision,
        decision_reason: reason,
        times_approved: decision === 'approved' ? existing.times_approved + 1 : existing.times_approved,
        times_denied: decision === 'denied' ? existing.times_denied + 1 : existing.times_denied,
        times_seen: existing.times_seen + 1,
        decided_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('ai_vehicle_validations')
        .update(updates)
        .eq('id', existing.id);

      if (error) throw error;
      
      console.log(`✅ [VEHICLE VALIDATION] Updated decision for "${vehicle}": ${decision} (${updates.times_approved}/${updates.times_denied})`);
    } else {
      // Create new record
      const { error } = await supabase
        .from('ai_vehicle_validations')
        .insert({
          vehicle_text: vehicle,
          decision,
          decision_reason: reason,
          times_approved: decision === 'approved' ? 1 : 0,
          times_denied: decision === 'denied' ? 1 : 0,
          times_seen: 1,
          decided_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      
      console.log(`✅ [VEHICLE VALIDATION] Saved new decision for "${vehicle}": ${decision}`);
    }
  } catch (error) {
    console.error('❌ [VEHICLE VALIDATION] Error saving vehicle decision:', error);
  }
};
