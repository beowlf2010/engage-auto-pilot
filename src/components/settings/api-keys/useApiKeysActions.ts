
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

const getErrorMessage = (error: any): string => {
  if (!error) return "An unknown error occurred.";
  
  // For Supabase FunctionsHttpError which has a context object
  if (error.context && typeof error.context.error === 'string') {
    return error.context.error;
  }
  
  // For other errors that have a message property
  if (error.message) {
    // Sometimes the message is a stringified JSON from the edge function
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error) return parsed.error;
      if (parsed.message) return parsed.message;
      return error.message;
    } catch (e) {
      // Not JSON, return as is
      return error.message;
    }
  }
  
  return "An unknown error occurred. Please check the browser console for details.";
};

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
      if (result && result.success) {
        toast({
          title: "Settings Updated",
          description: result.message || "Settings updated successfully",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "An unexpected error occurred while updating settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      const description = getErrorMessage(error);
      toast({
        title: "Update Failed",
        description: description,
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
      if (result && result.success) {
        toast({
          title: "Test SMS Sent!",
          description: `Test message sent successfully to ${formattedPhone}`,
        });
        setTestPhoneNumber("");
      } else {
        toast({
          title: "Test SMS Failed",
          description: result.error || "An unexpected error occurred in the SMS function.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      const description = getErrorMessage(error);
      toast({
        title: "Test SMS Failed",
        description: description,
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
