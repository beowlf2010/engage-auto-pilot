import React, { useState } from 'react';
import { testAIAutomation } from '@/utils/testAIAutomation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AIAutomationTester = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>AI Automation Function Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test AI Automation Function'}
        </Button>
        
        {result && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">
              Result: {result.success ? '✅ Success' : '❌ Failed'}
            </h3>
            <pre className="bg-slate-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};