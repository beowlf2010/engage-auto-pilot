
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiKeysState } from "./api-keys/useApiKeysState";
import { useApiKeysActions } from "./api-keys/useApiKeysActions";
import ApiKeyField from "./api-keys/ApiKeyField";
import TelnyxProfileField from "./api-keys/TelnyxProfileField";
import TestSMSCard from "./api-keys/TestSMSCard";
import AccessDeniedView from "./api-keys/AccessDeniedView";

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
