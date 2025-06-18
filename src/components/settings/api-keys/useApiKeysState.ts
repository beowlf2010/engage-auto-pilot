
import { useState, useEffect } from "react";

export const useApiKeysState = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingSMS, setIsTestingSMS] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [loadingStates, setLoadingStates] = useState({
    openai: false,
    twilioAccountSid: false,
    twilioAuthToken: false,
    twilioPhoneNumber: false
  });
  const [apiKeys, setApiKeys] = useState({
    openaiKey: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: ""
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
