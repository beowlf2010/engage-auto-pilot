import { supabase } from '@/integrations/supabase/client';

export async function runAISystemTest() {
  console.log('🧪 Starting comprehensive AI system test...');
  
  try {
    // Test the trigger-ai-test function which tests the entire pipeline
    const { data, error } = await supabase.functions.invoke('trigger-ai-test', {
      body: {}
    });

    if (error) {
      console.error('❌ AI System Test Failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        details: null
      };
    }

    console.log('✅ AI System Test Results:', data);
    
    return {
      success: data?.success || false,
      results: data?.results || null,
      summary: data?.results?.summary || null,
      error: null
    };

  } catch (error) {
    console.error('❌ AI System Test Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: null
    };
  }
}

export async function testAIGenerationDirect() {
  console.log('🧪 Testing AI generation directly...');
  
  try {
    // Test the intelligent-conversation-ai function directly with a sample lead
    const testPayload = {
      leadId: "7ad0b76c-5663-487e-ad88-17af43b8ddb8", // Corey Pious - real lead
      leadName: "Corey Pious",
      messageBody: "I'm interested in your 2025 Chevrolet Malibu inventory",
      latestCustomerMessage: "Is the car still available I would like to pay 500 down and cosigner for my daughter to get the car",
      conversationHistory: "",
      vehicleInterest: "2025 Chevrolet Malibu",
      leadSource: "test"
    };

    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: testPayload
    });

    if (error) {
      console.error('❌ Direct AI Generation Failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        message: null
      };
    }

    console.log('✅ Direct AI Generation Result:', data);
    
    return {
      success: data?.success || false,
      message: data?.message || null,
      intent: data?.intent || null,
      error: data?.error || null
    };

  } catch (error) {
    console.error('❌ Direct AI Generation Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: null
    };
  }
}