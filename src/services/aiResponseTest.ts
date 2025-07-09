
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export async function testAIResponse(
  leadId: string,
  leadName: string,
  customerMessage: string,
  vehicleInterest: string
) {
  console.log('🧪 Testing AI Response Generation...');
  
  try {
    const messageContext: MessageContext = {
      leadId,
      leadName,
      latestMessage: customerMessage,
      conversationHistory: [customerMessage],
      vehicleInterest
    };

    const response = await unifiedAIResponseEngine.generateResponse(messageContext);
    
    console.log('✅ Test Results:', {
      message: response?.message,
      intent: response?.intent,
      confidence: response?.confidence,
      responseStrategy: response?.responseStrategy
    });

    return response;
  } catch (error) {
    console.error('❌ AI Response Test Failed:', error);
    return null;
  }
}

export async function testMultipleScenarios() {
  console.log('🧪 Testing Multiple AI Scenarios...');
  
  const scenarios = [
    {
      leadId: 'test-1',
      leadName: 'John Smith',
      message: 'I am interested in a pickup truck',
      vehicle: 'pickup truck'
    },
    {
      leadId: 'test-2', 
      leadName: 'Sarah Johnson',
      message: 'What financing options do you have?',
      vehicle: 'SUV'
    }
  ];

  for (const scenario of scenarios) {
    const response = await testAIResponse(
      scenario.leadId,
      scenario.leadName,
      scenario.message,
      scenario.vehicle
    );
    
    console.log(`📊 Scenario ${scenario.leadId}:`, {
      message: response?.message,
      intent: response?.intent
    });
  }
}

export async function testConversationFlow(
  leadId: string,
  leadName: string,
  messages: string[],
  vehicleInterest: string
) {
  console.log('🔄 Testing Conversation Flow...');
  
  const messageContext: MessageContext = {
    leadId,
    leadName,
    latestMessage: messages[messages.length - 1],
    conversationHistory: messages,
    vehicleInterest
  };

  const response = await unifiedAIResponseEngine.generateResponse(messageContext);
  
  console.log('🔄 Conversation Flow Result:', {
    message: response?.message,
    intent: response?.intent?.primary
  });

  return response;
}
