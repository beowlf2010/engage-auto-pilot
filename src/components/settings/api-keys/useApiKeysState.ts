
import { useState } from "react";

export const useApiKeysState = () => {
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

  return {
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
  };
};
