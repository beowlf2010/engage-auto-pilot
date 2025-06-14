
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiKeysState } from "./api-keys/useApiKeysState";
import { useApiKeysActions } from "./api-keys/useApiKeysActions";
import ApiKeyField from "./api-keys/ApiKeyField";
import TelnyxProfileField from "./api-keys/TelnyxProfileField";
import TestSMSCard from "./api-keys/TestSMSCard";
import AccessDeniedView from "./api-keys/AccessDeniedView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface ApiKeysSettingsProps {
  userRole: string;
}

const ApiKeysSettings = ({ userRole }: ApiKeysSettingsProps) => {
  const {
    isTesting,
    setIsTesting,
    isTestingSMS,
    setIsTestingSMS,
    testPhoneNumber,
    setTestPhoneNumber,
    loadingStates,
    setLoadingStates,
    apiKeys,
    setApiKeys
  } = useApiKeysState();

  const {
    handleApiKeyUpdate,
    handleTestConnection,
    handleTestSMS
  } = useApiKeysActions({
    apiKeys,
    testPhoneNumber,
    setTestPhoneNumber,
    setLoadingStates,
    setIsTesting,
    setIsTestingSMS
  });

  if (userRole !== "admin") {
    return <AccessDeniedView />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <ApiKeyField
              id="openai_key"
              label="OpenAI API Key"
              placeholder="sk-..."
              value={apiKeys.openaiKey}
              description="Used for AI message generation"
              isLoading={loadingStates.openai}
              onChange={(value) => setApiKeys(prev => ({ ...prev, openaiKey: value }))}
              onUpdate={() => handleApiKeyUpdate('OPENAI_API_KEY', apiKeys.openaiKey, 'openaiKey')}
            />
            
            <ApiKeyField
              id="telnyx_key"
              label="Telnyx API Key"
              placeholder="KEY..."
              value={apiKeys.telnyxApiKey}
              description="Your Telnyx API v2 key for SMS services"
              isLoading={loadingStates.telnyxKey}
              onChange={(value) => setApiKeys(prev => ({ ...prev, telnyxApiKey: value }))}
              onUpdate={() => handleApiKeyUpdate('TELNYX_API_KEY', apiKeys.telnyxApiKey, 'telnyxApiKey')}
            />
            
            <TelnyxProfileField
              value={apiKeys.telnyxProfileId}
              isLoading={loadingStates.telnyxProfile}
              isTesting={isTesting}
              onChange={(value) => setApiKeys(prev => ({ ...prev, telnyxProfileId: value }))}
              onUpdate={() => handleApiKeyUpdate('TELNYX_MESSAGING_PROFILE_ID', apiKeys.telnyxProfileId, 'telnyxProfileId')}
              onTest={handleTestConnection}
            />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Having trouble connecting Telnyx?</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>Ensure your <strong>Telnyx API Key</strong> starts with <code>KEY...</code> and is from a V2 API credential.</li>
            <li>Your <strong>Telnyx Messaging Profile ID</strong> is a UUID (e.g., <code>123e4567-e89b-12d3-a456-426614174000</code>) found under "Messaging" in your Telnyx dashboard.</li>
            <li>Use the "Test" button next to the Profile ID to verify your credentials. If it fails, the error message will provide details.</li>
            <li>Make sure the phone number you are testing with is in E.164 format (e.g., <code>+15551234567</code>).</li>
          </ul>
        </AlertDescription>
      </Alert>

      <TestSMSCard
        testPhoneNumber={testPhoneNumber}
        isTestingSMS={isTestingSMS}
        onPhoneNumberChange={setTestPhoneNumber}
        onTestSMS={handleTestSMS}
      />
    </div>
  );
};

export default ApiKeysSettings;
