import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { leadSourceStrategy } from '@/services/leadSourceStrategy';

// Test different lead sources to see how AI responds differently
export const testSourceSpecificAI = async () => {
  console.log('🧪 Testing source-specific AI responses...');
  
  const testScenarios = [
    {
      source: 'AutoTrader',
      leadName: 'John Smith',
      message: 'I saw your car listing online and I\'m interested in more details',
      vehicleInterest: '2024 Toyota Camry'
    },
    {
      source: 'Facebook',
      leadName: 'Sarah Johnson',
      message: 'Hey, saw your post about cars. What do you have available?',
      vehicleInterest: 'Used SUV under $25k'
    },
    {
      source: 'Credit Application',
      leadName: 'Mike Wilson',
      message: 'I got approved for financing and ready to buy',
      vehicleInterest: '2023 Honda Accord'
    },
    {
      source: 'Referral from Tom Anderson',
      leadName: 'Lisa Brown',
      message: 'Tom said you guys were great to work with',
      vehicleInterest: 'Family sedan'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n📊 Testing source: ${scenario.source}`);
    
    // Get source data
    const sourceData = leadSourceStrategy.getLeadSourceData(scenario.source);
    console.log('Source analysis:', {
      category: sourceData.sourceCategory,
      urgency: sourceData.urgencyLevel,
      style: sourceData.communicationStyle,
      conversion: sourceData.conversionProbability
    });

    // Create message context
    const context: MessageContext = {
      leadId: 'test-lead-' + Date.now(),
      leadName: scenario.leadName,
      latestMessage: scenario.message,
      conversationHistory: [],
      vehicleInterest: scenario.vehicleInterest,
      leadSource: scenario.source,
      leadSourceData: sourceData
    };

    try {
      // Generate AI response
      const response = await unifiedAIResponseEngine.generateResponse(context);
      
      if (response) {
        console.log(`✅ AI Response for ${scenario.source}:`, {
          message: response.message,
          intent: response.intent,
          strategy: response.responseStrategy,
          confidence: response.confidence,
          reasoning: response.reasoning
        });
      } else {
        console.log(`❌ No response generated for ${scenario.source}`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${scenario.source}:`, error);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 Source-specific AI testing complete');
};

// Auto-run test in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Run test after a short delay to allow page to load
  setTimeout(() => {
    testSourceSpecificAI().catch(error => {
      console.error('❌ Source AI test failed:', error);
    });
  }, 3000);
}