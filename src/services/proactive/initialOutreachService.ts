
import { supabase } from '@/integrations/supabase/client';
import { formatProperName } from '@/utils/nameFormatter';
import { assessLeadDataQuality } from '../unifiedDataQualityService';

export interface InitialOutreachRequest {
  leadId: string;
  firstName: string;
  lastName?: string;
  vehicleInterest?: string;
  salespersonName?: string;
  dealershipName?: string;
}

export interface InitialOutreachResponse {
  message: string;
  strategy: string;
  confidence: number;
}

// Generate initial outreach messages for leads with no conversation history
export const generateInitialOutreachMessage = async (
  request: InitialOutreachRequest
): Promise<InitialOutreachResponse | null> => {
  try {
    console.log(`🚀 [INITIAL OUTREACH] Generating message for ${request.firstName}`);

    const salespersonName = request.salespersonName || 'Finn';
    const dealershipName = request.dealershipName || 'Jason Pilger Chevrolet';
    const formattedName = formatProperName(request.firstName);
    const vehicleInterest = request.vehicleInterest || 'finding the right vehicle';

    // Assess data quality for this lead
    const dataQuality = await assessLeadDataQuality(request.firstName, vehicleInterest);
    
    console.log(`🔍 [INITIAL OUTREACH] Data quality score: ${dataQuality.overallQualityScore}`);
    console.log(`📋 [INITIAL OUTREACH] Strategy: ${dataQuality.messageStrategy}`);

    // Use the edge function for initial outreach generation
    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: request.leadId,
        leadName: `${request.firstName} ${request.lastName || ''}`.trim(),
        vehicleInterest,
        conversationHistory: '', // No history for initial outreach
        leadInfo: {
          phone: '',
          status: 'new',
          lastReplyAt: new Date().toISOString()
        },
        conversationLength: 0,
        inventoryStatus: {
          hasInventory: true,
          totalVehicles: 20
        },
        isInitialContact: true,
        salespersonName,
        dealershipName,
        dataQuality,
        context: {
          initialOutreach: true,
          usePersonalGreeting: dataQuality.recommendations.usePersonalGreeting,
          useSpecificVehicle: dataQuality.recommendations.useSpecificVehicle
        }
      }
    });

    if (error) {
      console.error('❌ [INITIAL OUTREACH] Edge function error:', error);
      return generateTemplateMessage(formattedName, vehicleInterest, salespersonName, dealershipName, dataQuality);
    }

    if (data?.message) {
      console.log(`✅ [INITIAL OUTREACH] Generated AI message: ${data.message}`);
      return {
        message: data.message,
        strategy: dataQuality.messageStrategy,
        confidence: dataQuality.overallQualityScore
      };
    }

    // Fallback to template if AI fails
    return generateTemplateMessage(formattedName, vehicleInterest, salespersonName, dealershipName, dataQuality);

  } catch (error) {
    console.error('❌ [INITIAL OUTREACH] Error:', error);
    return generateTemplateMessage(
      formatProperName(request.firstName), 
      request.vehicleInterest || 'finding the right vehicle',
      request.salespersonName || 'Finn',
      request.dealershipName || 'Jason Pilger Chevrolet',
      null
    );
  }
};

// Template-based message generation as fallback
const generateTemplateMessage = (
  formattedName: string,
  vehicleInterest: string,
  salespersonName: string,
  dealershipName: string,
  dataQuality: any
): InitialOutreachResponse => {
  console.log(`📝 [INITIAL OUTREACH] Using template generation`);

  let message: string;
  let strategy: string;

  if (dataQuality?.recommendations?.usePersonalGreeting && 
      dataQuality?.recommendations?.useSpecificVehicle) {
    // Personal greeting with specific vehicle
    message = `Hi ${formattedName}! I'm ${salespersonName} with ${dealershipName}. I saw you were interested in ${vehicleInterest} and I'd love to help you find exactly what you're looking for. What's most important to you in your next vehicle?`;
    strategy = 'personal_with_vehicle';
  } else if (dataQuality?.recommendations?.usePersonalGreeting) {
    // Personal greeting, generic vehicle
    message = `Hi ${formattedName}! I'm ${salespersonName} with ${dealershipName}. I'm here to help you find the perfect vehicle for your needs. What type of vehicle are you looking for?`;
    strategy = 'personal_generic_vehicle';
  } else if (dataQuality?.recommendations?.useSpecificVehicle) {
    // Generic greeting with specific vehicle
    message = `Hello! Thanks for your interest in ${vehicleInterest}. I'm ${salespersonName} with ${dealershipName} and I'd love to help you explore your options. What features are most important to you?`;
    strategy = 'generic_with_vehicle';
  } else {
    // Fully generic approach
    message = `Hello! Thanks for your interest in finding the right vehicle. I'm ${salespersonName} with ${dealershipName} and I'm here to make your car shopping experience as smooth as possible. What type of vehicle are you looking for?`;
    strategy = 'fully_generic';
  }

  console.log(`✅ [INITIAL OUTREACH] Generated template message: ${message}`);

  return {
    message,
    strategy,
    confidence: dataQuality?.overallQualityScore || 0.7
  };
};
