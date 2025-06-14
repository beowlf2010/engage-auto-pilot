
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  updateTelnyxSettings, 
  testTelnyxConnection, 
  validatePhoneNumber, 
  formatPhoneNumber,
  sendTestSMS
} from "@/services/settingsService";
import { Key, Loader2, Send } from "lucide-react";

interface ApiKeysSettingsProps {
  userRole: string;
}

const ApiKeysSettings = ({ userRole }: ApiKeysSettingsProps) => {
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingSMS, setIsTestingSMS] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [loadingStates, setLoadingStates] = useState({
    openai: false,
    telnyxKey: false,
    telnyxProfile: false
  });
  const [apiKeys, setApiKeys] = useState({
    openaiKey: "sk-1234567890abcdef...",
    telnyxApiKey: "KEY0123456789ABCDEF...",
    telnyxProfileId: "12345678-1234-1234-1234-123456789012"
  });
  const { toast } = useToast();

  const handleApiKeyUpdate = async (settingType: string, value: string, keyType: keyof typeof loadingStates) => {
    setLoadingStates(prev => ({ ...prev, [keyType]: true }));
    try {
      const result = await updateTelnyxSettings(settingType, value);

      toast({
        title: "Settings Updated",
        description: result.message || "Settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [keyType]: false }));
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testTelnyxConnection(apiKeys.telnyxApiKey, apiKeys.telnyxProfileId);
      toast({
        title: "Connection Test",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to send the test SMS to",
        variant: "destructive"
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(testPhoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid US phone number (e.g., +1234567890 or 234-567-8900)",
        variant: "destructive"
      });
      return;
    }

    setIsTestingSMS(true);
    try {
      const result = await sendTestSMS(formattedPhone);
      toast({
        title: "Test SMS Sent!",
        description: `Test message sent successfully to ${formattedPhone}`,
      });
      setTestPhoneNumber("");
    } catch (error) {
      toast({
        title: "Test SMS Failed",
        description: error instanceof Error ? error.message : "Failed to send test SMS",
        variant: "destructive"
      });
    } finally {
      setIsTestingSMS(false);
    }
  };

  if (userRole !== "admin") {
    return (
      <div className="text-center py-12">
        <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">Admin Access Required</h3>
        <p className="text-slate-600">Only administrators can manage API keys</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="openai_key">OpenAI API Key</Label>
              <div className="flex space-x-2 mt-1">
                <Input 
                  id="openai_key"
                  type="password" 
                  placeholder="sk-..." 
                  value={apiKeys.openaiKey}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, openaiKey: e.target.value }))}
                  className="flex-1"
                />
                <Button 
                  variant="outline"
                  onClick={() => handleApiKeyUpdate('OPENAI_API_KEY', apiKeys.openaiKey, 'openai')}
                  disabled={loadingStates.openai}
                >
                  {loadingStates.openai ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for AI message generation</p>
            </div>
            
            <div>
              <Label htmlFor="telnyx_key">Telnyx API Key</Label>
              <div className="flex space-x-2 mt-1">
                <Input 
                  id="telnyx_key"
                  type="password" 
                  placeholder="KEY..." 
                  value={apiKeys.telnyxApiKey}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, telnyxApiKey: e.target.value }))}
                  className="flex-1"
                />
                <Button 
                  variant="outline"
                  onClick={() => handleApiKeyUpdate('TELNYX_API_KEY', apiKeys.telnyxApiKey, 'telnyxKey')}
                  disabled={loadingStates.telnyxKey}
                >
                  {loadingStates.telnyxKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Your Telnyx API v2 key for SMS services</p>
            </div>
            
            <div>
              <Label htmlFor="telnyx_profile">Telnyx Messaging Profile ID</Label>
              <div className="flex space-x-2 mt-1">
                <Input 
                  id="telnyx_profile"
                  placeholder="12345678-1234-1234-1234-123456789012" 
                  value={apiKeys.telnyxProfileId}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, telnyxProfileId: e.target.value }))}
                  className="flex-1"
                />
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleApiKeyUpdate('TELNYX_MESSAGING_PROFILE_ID', apiKeys.telnyxProfileId, 'telnyxProfile')}
                    disabled={loadingStates.telnyxProfile}
                  >
                    {loadingStates.telnyxProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Messaging profile ID from your Telnyx account</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleTestSMS}
                  disabled={isTestingSMS}
                >
                  {isTestingSMS ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Test SMS
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enter your phone number to test if your Telnyx configuration is working
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
