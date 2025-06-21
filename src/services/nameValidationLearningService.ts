
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
    // For now, return null since the ai_name_validations table doesn't exist
    // This will fall back to the original validation logic
    console.log(`🧠 [NAME VALIDATION] Checking learned validation for "${name}" - table not available, using fallback`);
    return null;
  } catch (error) {
    console.error('❌ [NAME VALIDATION] Error checking learned validation:', error);
    return null;
  }
};

export const saveNameValidationDecision = async (
  originalName: string,
  decision: 'approved' | 'denied',
  reason?: string
): Promise<void> => {
  try {
    // For now, just log the decision since the table doesn't exist
    console.log(`📝 [NAME VALIDATION] Would save decision for "${originalName}": ${decision}${reason ? ` (${reason})` : ''}`);
  } catch (error) {
    console.error('❌ [NAME VALIDATION] Error saving decision:', error);
  }
};
