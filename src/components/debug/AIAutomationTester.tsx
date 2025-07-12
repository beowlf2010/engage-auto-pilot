import React, { useState } from 'react';
import { testAIAutomation, testDirectSMS, testSimpleFunction, testAIConversation } from '@/services/settingsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AIAutomationTester = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);
  const [smsLoading, setSmsLoading] = useState(false);
  const [simpleResult, setSimpleResult] = useState<any>(null);
  const [simpleLoading, setSimpleLoading] = useState(false);
  const [aiConversationResult, setAiConversationResult] = useState<any>(null);
  const [aiConversationLoading, setAiConversationLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const testResult = await testAIAutomation();
      setResult(testResult);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runDirectSMSTest = async () => {
    setSmsLoading(true);
    setSmsResult(null);
    
    try {
      const testResult = await testDirectSMS();
      setSmsResult(testResult);
    } catch (error) {
      setSmsResult({ success: false, error: error.message });
    } finally {
      setSmsLoading(false);
    }
  };

  const runSimpleTest = async () => {
    setSimpleLoading(true);
    setSimpleResult(null);
    
    try {
      const testResult = await testSimpleFunction();
      setSimpleResult(testResult);
    } catch (error) {
      setSimpleResult({ success: false, error: error.message });
    } finally {
      setSimpleLoading(false);
    }
  };

  const runAIConversationTest = async () => {
    setAiConversationLoading(true);
    setAiConversationResult(null);
    
    try {
      const testResult = await testAIConversation();
      setAiConversationResult(testResult);
    } catch (error) {
      setAiConversationResult({ success: false, error: error.message });
    } finally {
      setAiConversationLoading(false);
    }
  };

  // Auto-run tests in sequence when component mounts
  React.useEffect(() => {
    const runAutomaticTests = async () => {
      console.log('🔧 [DEBUG] Starting automatic test sequence...');
      
      // First test simple function
      console.log('🔧 [DEBUG] Step 1: Testing simple function...');
      await runSimpleTest();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then test AI conversation directly
      console.log('🔧 [DEBUG] Step 2: Testing AI conversation...');
      await runAIConversationTest();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then test direct SMS
      console.log('🔧 [DEBUG] Step 3: Testing direct SMS...');
      await runDirectSMSTest();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Finally test AI automation
      console.log('🔧 [DEBUG] Step 4: Testing AI automation...');
      await runTest();
    };
    
    // Run tests only once when component mounts
    runAutomaticTests();
  }, []);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>AI Automation Debug Tests</CardTitle>
        <p className="text-sm text-muted-foreground">
          Running automatic debugging sequence...
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button 
            onClick={runTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test AI Automation'}
          </Button>
          
          <Button 
            onClick={runAIConversationTest} 
            disabled={aiConversationLoading}
            variant="outline"
            className="w-full"
          >
            {aiConversationLoading ? 'Testing...' : 'Test AI Conversation'}
          </Button>
          
          <Button 
            onClick={runDirectSMSTest} 
            disabled={smsLoading}
            variant="outline"
            className="w-full"
          >
            {smsLoading ? 'Testing...' : 'Test Direct SMS'}
          </Button>

          <Button 
            onClick={runSimpleTest} 
            disabled={simpleLoading}
            variant="secondary"
            className="w-full"
          >
            {simpleLoading ? 'Testing...' : 'Test Simple Function'}
          </Button>
        </div>
        
        {result && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">
              AI Automation Result: {result.success ? '✅ Success' : '❌ Failed'}
            </h3>
            <pre className="bg-slate-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        {aiConversationResult && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">
              AI Conversation Result: {aiConversationResult.success ? '✅ Success' : '❌ Failed'}
            </h3>
            <pre className="bg-slate-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(aiConversationResult, null, 2)}
            </pre>
          </div>
        )}
        
        {smsResult && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">
              Direct SMS Result: {smsResult.success ? '✅ Success' : '❌ Failed'}
            </h3>
            <pre className="bg-slate-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(smsResult, null, 2)}
            </pre>
          </div>
        )}
        
        {simpleResult && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">
              Simple Function Result: {simpleResult.success ? '✅ Success' : '❌ Failed'}
            </h3>
            <pre className="bg-slate-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(simpleResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};