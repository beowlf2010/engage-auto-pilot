import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  results?: any;
  error?: string;
  timestamp?: string;
}

export const AISystemTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('🔧 [AI-TEST] Starting AI system test...');
      
      const { data, error } = await supabase.functions.invoke('trigger-ai-test', {
        body: { test: true }
      });

      if (error) {
        throw error;
      }

      console.log('🔧 [AI-TEST] Test completed:', data);
      setResult(data);

    } catch (error: any) {
      console.error('❌ [AI-TEST] Test failed:', error);
      setResult({
        success: false,
        error: error.message || 'Test failed',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  const triggerManualAutomation = async () => {
    try {
      console.log('🤖 [MANUAL] Triggering manual automation...');
      
      const { data, error } = await supabase.functions.invoke('ai-automation', {
        body: {
          automated: false,
          source: 'manual_ai_test',
          priority: 'high',
          testMode: false
        }
      });

      if (error) {
        throw error;
      }

      console.log('🤖 [MANUAL] Automation triggered:', data);
      alert('Manual automation triggered! Check the logs and recent messages.');

    } catch (error: any) {
      console.error('❌ [MANUAL] Failed:', error);
      alert(`Failed to trigger automation: ${error.message}`);
    }
  };

  const renderTestResult = (result: TestResult) => {
    if (!result.results) {
      return (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription>
            {result.success ? "Test completed successfully!" : `Test failed: ${result.error}`}
          </AlertDescription>
        </Alert>
      );
    }

    const { aiDirectTest, realLeadTest, automationTest, summary } = result.results;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {summary.openaiConfigured ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                OpenAI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {summary.openaiConfigured ? "✅ API Key Configured" : "❌ API Key Missing"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {summary.aiGenerationWorking ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                AI Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {summary.aiGenerationWorking ? "✅ Working" : "❌ Failed"}
              </p>
              {aiDirectTest.messagePreview && (
                <p className="text-xs text-muted-foreground mt-2">
                  Sample: "{aiDirectTest.messagePreview}..."
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {summary.automationWorking ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                Automation System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {summary.automationWorking ? "✅ Working" : "❌ Failed"}
              </p>
              {automationTest.processed && (
                <p className="text-xs text-muted-foreground mt-2">
                  Processed: {automationTest.processed} leads
                </p>
              )}
            </CardContent>
          </Card>

          {realLeadTest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {realLeadTest.success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  Real Lead Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {realLeadTest.success ? "✅ Working" : "❌ Failed"}
                </p>
                {realLeadTest.messagePreview && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Sample: "{realLeadTest.messagePreview}..."
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {(aiDirectTest.error || automationTest.error || realLeadTest?.error) && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                {aiDirectTest.error && <p>AI Direct: {aiDirectTest.error}</p>}
                {automationTest.error && <p>Automation: {automationTest.error}</p>}
                {realLeadTest?.error && <p>Real Lead: {realLeadTest.error}</p>}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI System Diagnostics</CardTitle>
        <CardDescription>
          Test the AI message generation system and verify OpenAI integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runTest} disabled={testing} className="flex items-center gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {testing ? 'Running Test...' : 'Run AI System Test'}
          </Button>
          
          <Button onClick={triggerManualAutomation} variant="outline" className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Trigger Manual Automation
          </Button>
        </div>

        {result && renderTestResult(result)}

        {result?.timestamp && (
          <p className="text-xs text-muted-foreground">
            Last test: {new Date(result.timestamp).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};