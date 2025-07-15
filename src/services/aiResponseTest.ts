
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

// Run immediate comprehensive test
export async function runComprehensiveAITest() {
  console.log('🔧 [COMPREHENSIVE TEST] Starting full AI system diagnostic...');
  
  try {
    // Import the test runner
    const { runAISystemTest, testAIGenerationDirect } = await import('./aiTestRunner');
    
    // Step 1: Test the complete system
    console.log('🧪 [STEP 1] Testing complete AI automation system...');
    const systemTest = await runAISystemTest();
    
    // Step 2: Test direct AI generation
    console.log('🧪 [STEP 2] Testing direct AI message generation...');
    const directTest = await testAIGenerationDirect();
    
    const results = {
      systemTest,
      directTest,
      overall: {
        success: systemTest.success && directTest.success,
        issues: []
      }
    };
    
    if (!systemTest.success) {
      results.overall.issues.push('AI automation system failing');
    }
    
    if (!directTest.success) {
      results.overall.issues.push('AI message generation failing');
    }
    
    console.log('🔧 [COMPREHENSIVE TEST] Final Results:', results);
    
    return results;
    
  } catch (error) {
    console.error('❌ [COMPREHENSIVE TEST] Failed:', error);
    return {
      systemTest: { success: false, error: 'Test runner failed' },
      directTest: { success: false, error: 'Test runner failed' },
      overall: { success: false, issues: ['Test execution failed'] }
    };
  }
}

// Global function for manual testing in console
if (typeof window !== 'undefined') {
  (window as any).testAI = async () => {
    console.log('🔧 Manual AI Test Started...');
    const results = await runComprehensiveAITest();
    console.log('🔧 Manual AI Test Complete:', results);
    return results;
  };
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
