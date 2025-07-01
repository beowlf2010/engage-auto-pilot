
import { enhancedIntentRecognition, CustomerIntent } from './enhancedIntentRecognition';
import { professionalResponseTemplates } from './professionalResponseTemplates';
import { validateVehicleInterest } from './vehicleInterestValidationService';

export interface MessageContext {
  leadId: string;
  leadName: string;
  latestMessage: string;
  conversationHistory: string[];
  vehicleInterest?: string;
  previousIntent?: string;
}

export interface ContextAwareResponse {
  message: string;
  intent: CustomerIntent;
  confidence: number;
  responseStrategy: string;
  followUpAction?: string;
  reasoning: string;
}

class ContextAwareResponseService {
  generateResponse(context: MessageContext): ContextAwareResponse {
    console.log('🎯 [CONTEXT-AWARE] Analyzing latest message:', context.latestMessage.substring(0, 100));

    // Analyze the latest message for intent
    const intent = enhancedIntentRecognition.analyzeLatestMessage(context.latestMessage);
    
    console.log('🧠 [CONTEXT-AWARE] Detected intent:', {
      primary: intent.primary,
      confidence: intent.confidence,
      strategy: intent.responseStrategy,
      financialReadiness: intent.financialReadiness
    });

    // Validate vehicle interest for context
    const vehicleValidation = validateVehicleInterest(context.vehicleInterest);
    
    // Generate professional response based on intent
    let responseMessage = professionalResponseTemplates.generateResponse(
      intent.primary,
      context.latestMessage,
      context.leadName,
      intent.financialReadiness
    );

    // Ensure no placeholders or generic content
    responseMessage = this.sanitizeResponse(responseMessage, context.leadName);

    // Add vehicle context if valid and relevant
    if (vehicleValidation.isValid && this.shouldMentionVehicle(intent.primary)) {
      responseMessage = this.addVehicleContext(responseMessage, vehicleValidation.sanitizedMessage);
    }

    const followUpAction = professionalResponseTemplates.getFollowUpAction(intent.primary);

    return {
      message: responseMessage,
      intent,
      confidence: intent.confidence,
      responseStrategy: intent.responseStrategy,
      followUpAction,
      reasoning: `Responded to "${intent.primary}" with ${intent.responseStrategy} strategy. Financial readiness: ${intent.financialReadiness}. Confidence: ${Math.round(intent.confidence * 100)}%`
    };
  }

  private sanitizeResponse(response: string, leadName: string): string {
    // Remove any placeholders that might have slipped through
    const sanitized = response
      .replace(/\{[^}]*\}/g, '') // Remove any {placeholder} text
      .replace(/\[.*?\]/g, '') // Remove any [placeholder] text  
      .replace(/not specified/gi, '') // Remove "not specified"
      .replace(/undefined/gi, '') // Remove undefined
      .replace(/null/gi, '') // Remove null
      .replace(/\s+/g, ' ') // Clean up extra spaces
      .trim();

    // Ensure proper greeting
    if (!sanitized.toLowerCase().includes(leadName.toLowerCase()) && leadName !== 'there') {
      return `Hi ${leadName}! ${sanitized}`;
    }

    return sanitized;
  }

  private shouldMentionVehicle(intent: string): boolean {
    // Only mention vehicle for certain intents to avoid being pushy
    const vehicleRelevantIntents = [
      'general_inquiry',
      'financing_down_payment',
      'financing_monthly_payment',
      'buying_signal'
    ];
    
    return vehicleRelevantIntents.includes(intent);
  }

  private addVehicleContext(response: string, vehicleContext: string): string {
    // Add vehicle context naturally, not forcefully
    if (response.includes('?')) {
      // If there's already a question, add vehicle context before it
      const parts = response.split('?');
      const lastPart = parts.pop();
      const mainResponse = parts.join('?');
      return `${mainResponse} regarding ${vehicleContext}?${lastPart}`;
    } else {
      // Add at the end
      return `${response} I'm here to help with ${vehicleContext}.`;
    }
  }

  // Quality check for generated responses
  validateResponseQuality(response: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for placeholders
    if (response.includes('{') || response.includes('[') || response.includes('undefined') || response.includes('null')) {
      issues.push('Contains placeholder text');
    }

    // Check for generic responses
    if (response.toLowerCase().includes('ok') && response.length < 20) {
      issues.push('Response too generic/short');
    }

    // Check for "not specified" variations
    if (response.toLowerCase().includes('not specified') || response.toLowerCase().includes('unknown')) {
      issues.push('Contains invalid data references');
    }

    // Check for proper greeting
    if (!response.toLowerCase().includes('hi') && !response.toLowerCase().includes('hello') && !response.toLowerCase().includes('thanks')) {
      issues.push('Missing appropriate greeting/acknowledgment');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export const contextAwareResponseService = new ContextAwareResponseService();
