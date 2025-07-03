// Test file to verify AI response improvements for mixed questions
import { unifiedAIResponseEngine, MessageContext } from './unifiedAIResponseEngine';

export const testMixedQuestionResponse = () => {
  console.log('🧪 Testing improved AI response for mixed questions...');
  
  // Test the exact case from the user's example
  const testContext: MessageContext = {
    leadId: 'test-lead-123',
    leadName: 'Doris',
    latestMessage: 'Who is you and what\'s the price',
    conversationHistory: [],
    vehicleInterest: 'finding the right vehicle for your needs'
  };
  
  const response = unifiedAIResponseEngine.generateResponse(testContext);
  
  console.log('📝 Original message:', testContext.latestMessage);
  console.log('🤖 AI Response:', response.message);
  console.log('🎯 Intent Analysis:', response.intent);
  console.log('📊 Confidence:', response.confidence);
  console.log('🔧 Strategy:', response.responseStrategy);
  
  // Test case with specific vehicle interest
  const testContext2: MessageContext = {
    leadId: 'test-lead-456',
    leadName: 'John',
    latestMessage: 'who are you and how much does the 2024 Honda Civic cost',
    conversationHistory: [],
    vehicleInterest: '2024 Honda Civic'
  };
  
  const response2 = unifiedAIResponseEngine.generateResponse(testContext2);
  
  console.log('\n📝 Original message 2:', testContext2.latestMessage);
  console.log('🤖 AI Response 2:', response2.message);
  console.log('🎯 Intent Analysis 2:', response2.intent);
  
  return {
    test1: { context: testContext, response },
    test2: { context: testContext2, response: response2 }
  };
};

// Test various mixed question scenarios
export const testVariousMixedQuestions = () => {
  console.log('🧪 Testing various mixed question scenarios...');
  
  const testCases = [
    'Who is you and what\'s the price',
    'what is your name and is the car available',
    'who am i talking to and can we schedule a meeting',
    'who are you and do you take trades',
    'what\'s your name and what financing options do you have'
  ];
  
  testCases.forEach((message, index) => {
    const context: MessageContext = {
      leadId: `test-${index}`,
      leadName: 'Customer',
      latestMessage: message,
      conversationHistory: [],
      vehicleInterest: 'vehicles'
    };
    
    const response = unifiedAIResponseEngine.generateResponse(context);
    console.log(`\n${index + 1}. "${message}"`);
    console.log(`   Response: "${response.message}"`);
    console.log(`   Primary: ${response.intent.primary}, Secondary: ${response.intent.secondary}`);
  });
};