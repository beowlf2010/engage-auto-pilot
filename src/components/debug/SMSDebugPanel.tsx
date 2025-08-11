import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SMSDebugPanel = () => {
  const [isTestingDebug, setIsTestingDebug] = useState(false);
  const [isTestingSMS, setIsTestingSMS] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [smsResult, setSmsResult] = useState<any>(null);

  const testDebugFunction = async () => {
    setIsTestingDebug(true);
    try {
      console.log('🔍 Testing debug-sms-immediate function...');
      
      const { data, error } = await supabase.functions.invoke('debug-sms-immediate', {
        body: {}
      });

      if (error) {
        console.error('❌ Debug function error:', error);
        setDebugResult({ error: error.message });
        toast.error(`Debug function failed: ${error.message}`);
      } else {
        console.log('✅ Debug function result:', data);
        setDebugResult(data);
        toast.success('Debug function completed successfully');
      }
    } catch (error: any) {
      console.error('❌ Debug function exception:', error);
      setDebugResult({ error: error.message });
      toast.error(`Debug function exception: ${error.message}`);
    } finally {
      setIsTestingDebug(false);
    }
  };

  const testSMSFunction = async () => {
    setIsTestingSMS(true);
    try {
      console.log('📤 Testing send-sms function directly...');
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: '+13345640639',
          message: 'DEBUG TEST: Direct SMS test - please ignore',
          conversationId: null
        }
      });

      if (error) {
        console.error('❌ SMS function error:', error);
        setSmsResult({ error: error.message });
        toast.error(`SMS function failed: ${error.message}`);
      } else {
        console.log('✅ SMS function result:', data);
        setSmsResult(data);
        toast.success('SMS function completed');
      }
    } catch (error: any) {
      console.error('❌ SMS function exception:', error);
      setSmsResult({ error: error.message });
      toast.error(`SMS function exception: ${error.message}`);
    } finally {
      setIsTestingSMS(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 SMS Pipeline Debug Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={testDebugFunction}
              disabled={isTestingDebug}
              variant="outline"
            >
              {isTestingDebug ? 'Testing Debug Function...' : 'Test Debug Function'}
            </Button>

            <Button 
              onClick={testSMSFunction}
              disabled={isTestingSMS}
              variant="outline"
            >
              {isTestingSMS ? 'Testing SMS Function...' : 'Test SMS Function'}
            </Button>
          </div>

          {debugResult && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Debug Function Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(debugResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {smsResult && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">SMS Function Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(smsResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};