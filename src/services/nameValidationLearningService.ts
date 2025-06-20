
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
    
    // Use edge function to handle database operations
    const { data, error } = await supabase.functions.invoke('name-validation-helpers', {
      body: {
        action: 'get_name_validation_record',
        p_normalized_name: normalizedName
      }
    });

    if (error) {
      console.error('Error fetching existing validation:', error);
      return;
    }

    if (data && data.length > 0) {
      const record = data[0];
      // Update existing record
      const newTimesApproved = decision === 'approved' 
        ? (record.times_approved || 0) + 1 
        : (record.times_approved || 0);
      const newTimesRejected = decision === 'denied' 
        ? (record.times_rejected || 0) + 1 
        : (record.times_rejected || 0);

      await supabase.functions.invoke('name-validation-helpers', {
        body: {
          action: 'update_name_validation_record',
          p_id: record.id,
          p_times_seen: (record.times_seen || 0) + 1,
          p_times_approved: newTimesApproved,
          p_times_rejected: newTimesRejected,
          p_user_override_decision: decision,
          p_override_reason: userReason,
          p_confidence_after: decision === 'approved' ? 0.95 : 0.1,
          p_override_by: userId
        }
      });
    } else {
      // Create new record
      await supabase.functions.invoke('name-validation-helpers', {
        body: {
          action: 'insert_name_validation_record',
          p_original_name: originalName,
          p_normalized_name: normalizedName,
          p_original_validation_result: originalValidation,
          p_user_override_decision: decision,
          p_override_reason: userReason,
          p_confidence_before: originalValidation.confidence,
          p_confidence_after: decision === 'approved' ? 0.95 : 0.1,
          p_times_approved: decision === 'approved' ? 1 : 0,
          p_times_rejected: decision === 'denied' ? 1 : 0,
          p_override_by: userId
        }
      });
    }

    console.log(`✅ [LEARNING] Saved ${decision} decision for name: ${originalName}`);
  } catch (error) {
    console.error('Error in saveNameValidationDecision:', error);
  }
};

export const getLearnedNameValidation = async (name: string): Promise<any | null> => {
  try {
    const normalizedName = name.toLowerCase().trim();
    
    const { data, error } = await supabase.functions.invoke('name-validation-helpers', {
      body: {
        action: 'get_learned_name_validation',
        p_normalized_name: normalizedName
      }
    });

    if (error) {
      console.error('Error fetching learned validation:', error);
      return null;
    }

    if (data && data.length > 0) {
      const record = data[0];
      console.log(`🧠 [LEARNING] Found learned decision for "${name}": ${record.user_override_decision}`);
      return {
        isValidPersonalName: record.user_override_decision === 'approved',
        confidence: record.confidence_after || 0.95,
        detectedType: record.user_override_decision === 'approved' ? 'personal' : 'learned_override',
        userOverride: true,
        timesApproved: record.times_approved || 0,
        timesRejected: record.times_rejected || 0,
        timesSeen: record.times_seen || 0,
        suggestions: {
          useGenericGreeting: record.user_override_decision !== 'approved'
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
