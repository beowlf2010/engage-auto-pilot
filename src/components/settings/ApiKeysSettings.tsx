
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiKeysState } from "./api-keys/useApiKeysState";
import { useApiKeysActions } from "./api-keys/useApiKeysActions";
import ApiKeyField from "./api-keys/ApiKeyField";
import TwilioAccountSidField from "./api-keys/TwilioAccountSidField";
import TestSMSCard from "./api-keys/TestSMSCard";
import WebhookConfiguration from "./WebhookConfiguration";
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
            
            <TwilioAccountSidField
              value={apiKeys.twilioAccountSid}
              isLoading={loadingStates.twilioAccountSid}
              isTesting={isTesting}
              onChange={(value) => setApiKeys(prev => ({ ...prev, twilioAccountSid: value }))}
              onUpdate={() => handleApiKeyUpdate('TWILIO_ACCOUNT_SID', apiKeys.twilioAccountSid, 'twilioAccountSid')}
              onTest={handleTestConnection}
            />
            
            <ApiKeyField
              id="twilio_auth_token"
              label="Twilio Auth Token"
              placeholder="auth_token..."
              value={apiKeys.twilioAuthToken}
              description="Your Twilio Auth Token for SMS services"
              isLoading={loadingStates.twilioAuthToken}
              onChange={(value) => setApiKeys(prev => ({ ...prev, twilioAuthToken: value }))}
              onUpdate={() => handleApiKeyUpdate('TWILIO_AUTH_TOKEN', apiKeys.twilioAuthToken, 'twilioAuthToken')}
            />

            <ApiKeyField
              id="twilio_phone_number"
              label="Twilio Phone Number"
              placeholder="+1234567890"
              value={apiKeys.twilioPhoneNumber}
              description="Your Twilio phone number for sending SMS (in E.164 format)"
              isLoading={loadingStates.twilioPhoneNumber}
              onChange={(value) => setApiKeys(prev => ({ ...prev, twilioPhoneNumber: value }))}
              onUpdate={() => handleApiKeyUpdate('TWILIO_PHONE_NUMBER', apiKeys.twilioPhoneNumber, 'twilioPhoneNumber')}
            />
          </div>
        </CardContent>
      </Card>

      <WebhookConfiguration />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Having trouble connecting Twilio?</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>Ensure your <strong>Twilio Account SID</strong> starts with <code>AC</code> and is found in your Twilio Console dashboard.</li>
            <li>Your <strong>Twilio Auth Token</strong> is the secret token from your Twilio Console (not the test token).</li>
            <li>Your <strong>Twilio Phone Number</strong> must be in E.164 format (e.g., <code>+15551234567</code>) and purchased from Twilio.</li>
            <li>Use the "Test" button next to the Account SID to verify your credentials. If it fails, the error message will provide details.</li>
            <li>Make sure the phone number you are testing with is in E.164 format (e.g., <code>+15551234567</code>).</li>
            <li><strong>Configure the webhook URL</strong> in your Twilio console using the configuration section above.</li>
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
