
import { supabase } from '@/integrations/supabase/client';

export interface VehicleInterestValidation {
  isValid: boolean;
  sanitizedInterest: string;
  issues: string[];
  confidence: number;
}

// Known problematic patterns in vehicle interest data
const INVALID_PATTERNS = [
  /unknown/i,
  /not\s+specified/i,
  /n\/a/i,
  /null/i,
  /undefined/i,
  /test/i,
  /sample/i,
  /demo/i,
  /make\s+unknown/i,
  /model\s+unknown/i,
  /year\s+unknown/i,
  /^\s*$/,
  /^-+$/,
  /^\.+$/
];

// Valid vehicle makes to check against
const VALID_MAKES = [
  'chevrolet', 'chevy', 'gmc', 'buick', 'cadillac', 'ford', 'toyota', 'honda', 
  'nissan', 'hyundai', 'kia', 'mazda', 'subaru', 'volkswagen', 'bmw', 'mercedes', 
  'audi', 'lexus', 'acura', 'infiniti', 'volvo', 'jaguar', 'land rover', 'porsche',
  'tesla', 'lincoln', 'chrysler', 'jeep', 'ram', 'dodge', 'mitsubishi'
];

// Validate vehicle interest data
export const validateVehicleInterest = (vehicleInterest: string): VehicleInterestValidation => {
  const issues: string[] = [];
  let sanitizedInterest = vehicleInterest?.trim() || '';
  let confidence = 1.0;

  // Check if the interest is null or empty
  if (!vehicleInterest || vehicleInterest.trim() === '') {
    return {
      isValid: false,
      sanitizedInterest: 'finding the right vehicle for your needs',
      issues: ['Vehicle interest is empty or null'],
      confidence: 0.0
    };
  }

  // Check for invalid patterns
  const hasInvalidPattern = INVALID_PATTERNS.some(pattern => pattern.test(sanitizedInterest));
  if (hasInvalidPattern) {
    issues.push('Contains invalid or placeholder text');
    confidence -= 0.8;
  }

  // Check if it's too short (likely corrupted)
  if (sanitizedInterest.length < 3) {
    issues.push('Vehicle interest too short');
    confidence -= 0.5;
  }

  // Check if it's suspiciously long (likely corrupted)
  if (sanitizedInterest.length > 200) {
    issues.push('Vehicle interest suspiciously long');
    confidence -= 0.3;
    sanitizedInterest = sanitizedInterest.substring(0, 200) + '...';
  }

  // Check if it contains at least one valid make (bonus points)
  const containsValidMake = VALID_MAKES.some(make => 
    sanitizedInterest.toLowerCase().includes(make)
  );
  if (containsValidMake) {
    confidence += 0.2;
  }

  // Clean up common formatting issues
  sanitizedInterest = sanitizedInterest
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\w\s\-]/g, ' ') // Remove special characters except hyphens
    .trim();

  // Final validation
  const isValid = confidence > 0.3 && issues.length === 0;

  // If not valid, provide a generic fallback
  if (!isValid) {
    sanitizedInterest = 'finding the right vehicle for your needs';
  }

  return {
    isValid,
    sanitizedInterest,
    issues,
    confidence: Math.max(0, Math.min(1, confidence))
  };
};

// Validate and update a lead's vehicle interest
export const validateAndUpdateLeadVehicleInterest = async (leadId: string): Promise<boolean> => {
  try {
    // Get current vehicle interest
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('vehicle_interest')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      console.error('❌ [VEHICLE VALIDATOR] Error fetching lead:', fetchError);
      return false;
    }

    // Validate the vehicle interest
    const validation = validateVehicleInterest(lead.vehicle_interest);

    // Update if needed
    if (!validation.isValid || validation.sanitizedInterest !== lead.vehicle_interest) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          vehicle_interest: validation.sanitizedInterest,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('❌ [VEHICLE VALIDATOR] Error updating lead vehicle interest:', updateError);
        return false;
      }

      console.log(`🔧 [VEHICLE VALIDATOR] Updated vehicle interest for lead ${leadId}: "${validation.sanitizedInterest}"`);
    }

    return true;
  } catch (error) {
    console.error('❌ [VEHICLE VALIDATOR] Error in validateAndUpdateLeadVehicleInterest:', error);
    return false;
  }
};

// Bulk validate all leads' vehicle interests
export const bulkValidateVehicleInterests = async (): Promise<number> => {
  try {
    console.log('🔧 [VEHICLE VALIDATOR] Starting bulk validation of vehicle interests...');

    // Get all leads with potentially invalid vehicle interests
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, vehicle_interest')
      .or(`vehicle_interest.is.null,vehicle_interest.eq.''`);

    if (fetchError) {
      console.error('❌ [VEHICLE VALIDATOR] Error fetching leads for bulk validation:', fetchError);
      return 0;
    }

    let updatedCount = 0;

    for (const lead of leads || []) {
      const validation = validateVehicleInterest(lead.vehicle_interest);
      
      if (!validation.isValid) {
        const success = await validateAndUpdateLeadVehicleInterest(lead.id);
        if (success) updatedCount++;
      }
    }

    console.log(`✅ [VEHICLE VALIDATOR] Bulk validation complete. Updated ${updatedCount} leads.`);
    return updatedCount;
  } catch (error) {
    console.error('❌ [VEHICLE VALIDATOR] Error in bulkValidateVehicleInterests:', error);
    return 0;
  }
};
