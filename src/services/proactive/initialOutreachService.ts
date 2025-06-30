
import { supabase } from '@/integrations/supabase/client';
import { formatProperName } from '@/utils/nameFormatter';
import { assessLeadDataQuality } from '../unifiedDataQualityService';
import { vehiclePersonalizationService, PersonalizationContext } from '../vehicleIntelligence/vehiclePersonalizationService';
import { responseVariationService } from '../responseVariationService';

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

// Enhanced template variations for different approaches
const outreachTemplates = {
  personal_with_vehicle: [
    "Hi {name}! I'm {salesperson} with {dealership}. I saw you were interested in {vehicle} and I'd love to help you find exactly what you're looking for. What's most important to you in your next vehicle?",
    "Hello {name}! I'm {salesperson} from {dealership}. The {vehicle} caught my attention on your inquiry - it's a fantastic choice! What features are you most excited about?",
    "Hi there {name}! {salesperson} here from {dealership}. I noticed your interest in {vehicle} and wanted to reach out personally. What draws you to this particular vehicle?",
    "Hey {name}! This is {salesperson} with {dealership}. I see you're considering {vehicle} - great taste! What can I tell you about it?",
    "Hello {name}! I'm {salesperson} at {dealership}. The {vehicle} is an excellent choice! What would you like to know about it first?"
  ],
  personal_generic_vehicle: [
    "Hi {name}! I'm {salesperson} with {dealership}. I'm here to help you find the perfect vehicle for your needs. What type of vehicle fits your lifestyle best?",
    "Hello {name}! {salesperson} from {dealership} here. I'd love to help you explore your vehicle options. What are you looking for in your next ride?",
    "Hi there {name}! This is {salesperson} with {dealership}. I'm excited to help you find exactly what you need. What's your ideal vehicle like?",
    "Hey {name}! {salesperson} here from {dealership}. Ready to help you discover your perfect match. What matters most to you in a vehicle?",
    "Hello {name}! I'm {salesperson} at {dealership}, and I'm here to make your car shopping experience great. What are you hoping to find?"
  ],
  generic_with_vehicle: [
    "Hello! Thanks for your interest in {vehicle}. I'm {salesperson} with {dealership} and I'd love to help you explore your options. What features are most important to you?",
    "Hi there! I see you're considering {vehicle} - excellent choice! I'm {salesperson} from {dealership}. What would you like to know about it?",
    "Hello! The {vehicle} is a great option. I'm {salesperson} with {dealership}, ready to answer any questions you might have. What interests you most?",
    "Hi! Thanks for looking at {vehicle}. I'm {salesperson} from {dealership} and I'm here to help. What can I share with you about it?",
    "Hello! I noticed your interest in {vehicle}. I'm {salesperson} with {dealership}, and I'd love to provide more details. What would be most helpful?"
  ],
  fully_generic: [
    "Hello! Thanks for your interest in finding the right vehicle. I'm {salesperson} with {dealership} and I'm here to make your car shopping experience as smooth as possible. What type of vehicle are you looking for?",
    "Hi there! I'm {salesperson} from {dealership}, ready to help you find your perfect vehicle. What brings you to us today?",
    "Hello! I'm {salesperson} with {dealership} and I'd love to help you discover your ideal vehicle. What are you hoping to find?",
    "Hi! Thanks for reaching out about finding a vehicle. I'm {salesperson} from {dealership}, here to make this process easy for you. What can I help you with?",
    "Hello there! I'm {salesperson} with {dealership}, excited to help you find exactly what you need. What type of vehicle fits your lifestyle?"
  ],
  time_sensitive: [
    "Hi {name}! {salesperson} here from {dealership}. I wanted to reach out quickly about {vehicle} - I have some great information to share! When's a good time to chat?",
    "Hello {name}! This is {salesperson} with {dealership}. I saw your interest in {vehicle} and didn't want you to miss out on what we have available. Can we talk soon?",
    "Hi {name}! {salesperson} from {dealership} here. I have some exciting updates about {vehicle} that I think you'll want to hear. Are you free for a quick conversation?"
  ],
  consultative: [
    "Hi {name}! I'm {salesperson} with {dealership}. I'd love to learn more about what you're looking for in {vehicle} so I can provide the most helpful information. What's your biggest priority?",
    "Hello {name}! {salesperson} here from {dealership}. Rather than overwhelming you with information, I'd like to understand your needs first. What matters most in your vehicle search?",
    "Hi {name}! This is {salesperson} with {dealership}. Every customer has unique needs, so I'd love to hear about yours regarding {vehicle}. What's your situation?"
  ]
};

// Generate initial outreach messages for leads with no conversation history
export const generateInitialOutreachMessage = async (
  request: InitialOutreachRequest
): Promise<InitialOutreachResponse | null> => {
  try {
    console.log(`🚀 [INITIAL OUTREACH] Generating diverse message for ${request.firstName}`);

    const salespersonName = request.salespersonName || 'Finn';
    const dealershipName = request.dealershipName || 'Jason Pilger Chevrolet';
    const formattedName = formatProperName(request.firstName);
    const vehicleInterest = request.vehicleInterest || 'finding the right vehicle';

    // Try response variation service first for maximum diversity
    try {
      const response = responseVariationService.generateContextualResponse({
        leadId: request.leadId,
        leadName: formattedName,
        vehicleInterest,
        timeOfDay: getTimeOfDay(),
        conversationStage: 'initial'
      });
      
      if (response && response.length > 20) { // Ensure reasonable response
        console.log(`✅ [INITIAL OUTREACH] Using response variation service`);
        return {
          message: response,
          strategy: 'response_variation_service',
          confidence: 0.9
        };
      }
    } catch (error) {
      console.log('Response variation service not available, continuing with templates');
    }

    // NEW: Use vehicle personalization service for initial outreach
    const personalizationContext: PersonalizationContext = {
      leadId: request.leadId,
      leadName: formattedName,
      originalVehicleInterest: vehicleInterest,
      salespersonName,
    };

    const personalizedMessage = await vehiclePersonalizationService.generatePersonalizedMessage(personalizationContext);

    if (personalizedMessage.confidence > 0.7) {
      console.log(`✅ [INITIAL OUTREACH] Using vehicle-personalized message with ${personalizedMessage.confidence} confidence`);
      return {
        message: personalizedMessage.message,
        strategy: personalizedMessage.strategy,
        confidence: personalizedMessage.confidence
      };
    }

    // Fallback to data quality assessment for edge function approach
    const dataQuality = await assessLeadDataQuality(request.firstName, vehicleInterest);
    
    console.log(`🔍 [INITIAL OUTREACH] Data quality score: ${dataQuality.overallQualityScore}`);
    console.log(`📋 [INITIAL OUTREACH] Strategy: ${dataQuality.messageStrategy}`);

    // Use the edge function for initial outreach generation with vehicle context
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
          vehicleIntelligent: true,
          usePersonalGreeting: dataQuality.recommendations.usePersonalGreeting,
          useSpecificVehicle: dataQuality.recommendations.useSpecificVehicle
        }
      }
    });

    if (error) {
      console.error('❌ [INITIAL OUTREACH] Edge function error:', error);
      return generateEnhancedTemplateMessage(formattedName, vehicleInterest, salespersonName, dealershipName, dataQuality);
    }

    if (data?.message) {
      console.log(`✅ [INITIAL OUTREACH] Generated AI message: ${data.message}`);
      return {
        message: data.message,
        strategy: dataQuality.messageStrategy,
        confidence: dataQuality.overallQualityScore
      };
    }

    // Fallback to enhanced template if AI fails
    return generateEnhancedTemplateMessage(formattedName, vehicleInterest, salespersonName, dealershipName, dataQuality);

  } catch (error) {
    console.error('❌ [INITIAL OUTREACH] Error:', error);
    return generateEnhancedTemplateMessage(
      formatProperName(request.firstName), 
      request.vehicleInterest || 'finding the right vehicle',
      request.salespersonName || 'Finn',
      request.dealershipName || 'Jason Pilger Chevrolet',
      null
    );
  }
};

// Enhanced template-based message generation with much more variety
const generateEnhancedTemplateMessage = (
  formattedName: string,
  vehicleInterest: string,
  salespersonName: string,
  dealershipName: string,
  dataQuality: any
): InitialOutreachResponse => {
  console.log(`📝 [INITIAL OUTREACH] Using enhanced template generation`);

  let templates: string[];
  let strategy: string;

  // Determine approach based on context and add randomization
  const usePersonalGreeting = dataQuality?.recommendations?.usePersonalGreeting ?? (Math.random() < 0.7);
  const useSpecificVehicle = dataQuality?.recommendations?.useSpecificVehicle ?? (Math.random() < 0.8);
  const timeOfDay = getTimeOfDay();
  const isTimeBasedApproach = Math.random() < 0.2; // 20% chance for time-based approach
  const isConsultativeApproach = Math.random() < 0.3; // 30% chance for consultative approach

  if (isTimeBasedApproach && useSpecificVehicle) {
    templates = outreachTemplates.time_sensitive;
    strategy = 'time_sensitive_with_vehicle';
  } else if (isConsultativeApproach) {
    templates = outreachTemplates.consultative;
    strategy = 'consultative_approach';
  } else if (usePersonalGreeting && useSpecificVehicle) {
    templates = outreachTemplates.personal_with_vehicle;
    strategy = 'personal_with_vehicle';
  } else if (usePersonalGreeting) {
    templates = outreachTemplates.personal_generic_vehicle;
    strategy = 'personal_generic_vehicle';
  } else if (useSpecificVehicle) {
    templates = outreachTemplates.generic_with_vehicle;
    strategy = 'generic_with_vehicle';
  } else {
    templates = outreachTemplates.fully_generic;
    strategy = 'fully_generic';
  }

  // Select random template from the chosen set
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Replace placeholders
  const message = template
    .replace(/\{name\}/g, formattedName)
    .replace(/\{salesperson\}/g, salespersonName)
    .replace(/\{dealership\}/g, dealershipName)
    .replace(/\{vehicle\}/g, vehicleInterest);

  console.log(`✅ [INITIAL OUTREACH] Generated enhanced template message using ${strategy}: ${message}`);

  return {
    message,
    strategy,
    confidence: dataQuality?.overallQualityScore || 0.8
  };
};

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};
