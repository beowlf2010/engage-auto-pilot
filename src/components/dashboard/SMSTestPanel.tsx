import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SMSTestPanel = () => {
  const [phoneNumber, setPhoneNumber] = useState("+15551234567");
  const [message, setMessage] = useState("Hello! This is a test message from your SMS system.");
  const [loading, setLoading] = useState(false);
  const [automationLoading, setAutomationLoading] = useState(false);

  const testSMS = async () => {
    if (!phoneNumber || !message) {
      toast.error("Please provide both phone number and message");
      return;
    }

    setLoading(true);
    try {
      console.log("Testing SMS manually...");
      
      const { data, error } = await supabase.functions.invoke('test-sms', {
        body: { 
          to: phoneNumber, 
          message: message 
        }
      });

      if (error) {
        console.error("SMS Test Error:", error);
        toast.error(`SMS test failed: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success(`SMS sent successfully! Message ID: ${data.messageSid}`);
        console.log("SMS Test Success:", data);
      } else {
        toast.error(`SMS failed: ${data?.error || 'Unknown error'}`);
        console.error("SMS Test Failed:", data);
      }
    } catch (err) {
      console.error("SMS Test Exception:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutomation = async () => {
    setAutomationLoading(true);
    try {
      console.log("Triggering AI automation manually...");
      
      const { data, error } = await supabase.functions.invoke('ai-automation', {
        body: { 
          source: 'manual_test',
          priority: 'high'
        }
      });

      if (error) {
        console.error("Automation Error:", error);
        toast.error(`Automation failed: ${error.message}`);
        return;
      }

      console.log("Automation Response:", data);
      
      if (data?.processed) {
        toast.success(`Automation completed! Processed: ${data.processed}, Successful: ${data.successful}, Failed: ${data.failed}`);
      } else {
        toast.info(`Automation result: ${data?.message || 'Completed'}`);
      }
    } catch (err) {
      console.error("Automation Exception:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setAutomationLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 SMS System Testing
        </CardTitle>
        <CardDescription>
          Test the SMS system manually and trigger automation to debug issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual SMS Test */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Manual SMS Test</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+15551234567"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use E.164 format (e.g., +15551234567)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your test message..."
                className="mt-1"
                rows={3}
              />
            </div>
            <Button 
              onClick={testSMS} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Sending..." : "Send Test SMS"}
            </Button>
          </div>
        </div>

        {/* Automation Test */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">AI Automation Test</h3>
          <p className="text-sm text-muted-foreground">
            Trigger the AI automation process manually to test lead processing
          </p>
          <Button 
            onClick={triggerAutomation} 
            disabled={automationLoading}
            variant="secondary"
            className="w-full"
          >
            {automationLoading ? "Running..." : "Trigger AI Automation"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};