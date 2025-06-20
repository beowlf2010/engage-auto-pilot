
import { supabase } from '@/integrations/supabase/client';
import type { NameValidationResult } from './nameValidationService';
import type { VehicleInterestValidationResult } from './vehicleInterestValidationService';

export interface ValidationDecision {
  type: 'name' | 'vehicle';
  decision: 'approved' | 'denied';
  originalValue: string;
  originalValidation: any;
  userReason?: string;
}

export const saveNameValidationDecision = async (
  originalName: string,
  originalValidation: NameValidationResult,
  decision: 'approved' | 'denied',
  userReason?: string,
  userId?: string
) => {
  try {
    const normalizedName = originalName.toLowerCase().trim();
    
    // Check if we already have a record for this name
    const { data: existing, error: fetchError } = await supabase
      .from('ai_name_validations')
      .select('*')
      .eq('normalized_name', normalizedName)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing validation:', fetchError);
      return;
    }

    if (existing) {
      // Update existing record
      const newTimesApproved = decision === 'approved' 
        ? existing.times_approved + 1 
        : existing.times_approved;
      const newTimesRejected = decision === 'denied' 
        ? existing.times_rejected + 1 
        : existing.times_rejected;

      const { error: updateError } = await supabase
        .from('ai_name_validations')
        .update({
          times_seen: existing.times_seen + 1,
          times_approved: newTimesApproved,
          times_rejected: newTimesRejected,
          user_override_decision: decision,
          override_reason: userReason,
          confidence_after: decision === 'approved' ? 0.95 : 0.1,
          override_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating validation decision:', updateError);
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('ai_name_validations')
        .insert({
          original_name: originalName,
          normalized_name: normalizedName,
          original_validation_result: originalValidation,
          user_override_decision: decision,
          override_reason: userReason,
          confidence_before: originalValidation.confidence,
          confidence_after: decision === 'approved' ? 0.95 : 0.1,
          times_approved: decision === 'approved' ? 1 : 0,
          times_rejected: decision === 'denied' ? 1 : 0,
          override_by: userId
        });

      if (insertError) {
        console.error('Error saving validation decision:', insertError);
      }
    }

    console.log(`✅ [LEARNING] Saved ${decision} decision for name: ${originalName}`);
  } catch (error) {
    console.error('Error in saveNameValidationDecision:', error);
  }
};

export const getLearnedNameValidation = async (name: string): Promise<any | null> => {
  try {
    const normalizedName = name.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('ai_name_validations')
      .select('*')
      .eq('normalized_name', normalizedName)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching learned validation:', error);
      return null;
    }

    if (data && data.user_override_decision) {
      console.log(`🧠 [LEARNING] Found learned decision for "${name}": ${data.user_override_decision}`);
      return {
        isValidPersonalName: data.user_override_decision === 'approved',
        confidence: data.confidence_after || 0.95,
        detectedType: data.user_override_decision === 'approved' ? 'personal' : 'learned_override',
        userOverride: true,
        timesApproved: data.times_approved,
        timesRejected: data.times_rejected,
        timesSeen: data.times_seen,
        suggestions: {
          useGenericGreeting: data.user_override_decision !== 'approved'
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error in getLearnedNameValidation:', error);
    return null;
  }
};

// TODO: Similar functions for vehicle validation learning
export const saveVehicleValidationDecision = async (
  originalVehicle: string,
  originalValidation: VehicleInterestValidationResult,
  decision: 'approved' | 'denied',
  userReason?: string,
  userId?: string
) => {
  // Implementation will be similar to name validation
  // For now, just log the decision
  console.log(`✅ [LEARNING] Would save ${decision} decision for vehicle: ${originalVehicle}`);
};
