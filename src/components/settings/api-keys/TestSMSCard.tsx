
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Bot } from "lucide-react";
import { testAIAutomation } from "@/services/settingsService";

interface TestSMSCardProps {
  testPhoneNumber: string;
  isTestingSMS: boolean;
  onPhoneNumberChange: (value: string) => void;
  onTestSMS: () => void;
}

const TestSMSCard = ({
  testPhoneNumber,
  isTestingSMS,
  onPhoneNumberChange,
  onTestSMS
}: TestSMSCardProps) => {
  const handleTestAutomation = async () => {
    try {
      console.log('Testing AI automation...');
      await testAIAutomation();
    } catch (error) {
      console.error('AI automation test failed:', error);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test SMS Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="test_phone">Test Phone Number</Label>
            <div className="flex space-x-2 mt-1">
              <Input 
                id="test_phone"
                placeholder="+1234567890" 
                value={testPhoneNumber}
                onChange={(e) => onPhoneNumberChange(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={onTestSMS}
                disabled={isTestingSMS || !testPhoneNumber.trim()}
              >
                {isTestingSMS ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Test SMS
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enter your phone number to test if your Twilio configuration is working correctly
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={handleTestAutomation}
              variant="outline"
              className="w-full"
            >
              <Bot className="w-4 h-4 mr-2" />
              Test AI Automation
            </Button>
            <p className="text-xs text-slate-500 mt-1 text-center">
              Test the full AI automation pipeline (check browser console for details)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestSMSCard;
