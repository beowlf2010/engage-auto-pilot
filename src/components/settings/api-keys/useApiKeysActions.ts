
import { useToast } from "@/hooks/use-toast";
import { 
  updateTelnyxSettings, 
  testTelnyxConnection, 
  validatePhoneNumber, 
  formatPhoneNumber,
  sendTestSMS
} from "@/services/settingsService";

interface UseApiKeysActionsProps {
  apiKeys: {
    openaiKey: string;
    telnyxApiKey: string;
    telnyxProfileId: string;
  };
  testPhoneNumber: string;
  setTestPhoneNumber: (value: string) => void;
  setLoadingStates: (value: any) => void;
  setIsTesting: (value: boolean) => void;
  setIsTestingSMS: (value: boolean) => void;
}

export const useApiKeysActions = ({
  apiKeys,
  testPhoneNumber,
  setTestPhoneNumber,
  setLoadingStates,
  setIsTesting,
  setIsTestingSMS
}: UseApiKeysActionsProps) => {
  const { toast } = useToast();

  const handleApiKeyUpdate = async (settingType: string, value: string, keyType: keyof typeof apiKeys) => {
    const loadingKey = keyType === 'openaiKey' ? 'openai' : keyType === 'telnyxApiKey' ? 'telnyxKey' : 'telnyxProfile';
    setLoadingStates((prev: any) => ({ ...prev, [loadingKey]: true }));
    
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
      setLoadingStates((prev: any) => ({ ...prev, [loadingKey]: false }));
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

  return {
    handleApiKeyUpdate,
    handleTestConnection,
    handleTestSMS
  };
};
