import { runAISystemTest, testAIGenerationDirect } from '@/services/aiTestRunner';
import { testAIAutomation } from '@/utils/testAIAutomation';

export const runComprehensiveAIHealthCheck = async () => {
  console.log('🔍 Starting AI Health Check...');
  
  const results = {
    systemTest: null,
    directGeneration: null,
    automation: null,
    overall: 'unknown'
  };

  try {
    // Test 1: AI System Test
    console.log('1️⃣ Testing AI System...');
    results.systemTest = await runAISystemTest();
    
    // Test 2: Direct AI Generation
    console.log('2️⃣ Testing Direct AI Generation...');
    results.directGeneration = await testAIGenerationDirect();
    
    // Test 3: AI Automation
    console.log('3️⃣ Testing AI Automation...');
    results.automation = await testAIAutomation();
    
    // Determine overall health
    const allSuccessful = [
      results.systemTest?.success,
      results.directGeneration?.success,
      results.automation?.success
    ].every(result => result === true);
    
    results.overall = allSuccessful ? 'healthy' : 'issues_detected';
    
    console.log('🏁 AI Health Check Complete:', results);
    return results;
    
  } catch (error) {
    console.error('❌ AI Health Check Failed:', error);
    results.overall = 'critical_error';
    return results;
  }
};

// Auto-run health check
runComprehensiveAIHealthCheck().then(results => {
  console.log('📊 AI Health Status:', results.overall);
  
  if (results.overall === 'healthy') {
    console.log('✅ All AI systems are functioning properly');
  } else {
    console.log('⚠️ AI system issues detected - check individual test results');
  }
});