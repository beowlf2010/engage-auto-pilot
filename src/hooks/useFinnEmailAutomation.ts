
import { useState, useEffect } from 'react';
import { finnEmailService } from '@/services/finnEmailService';

interface EmailAutomationState {
  enabled: boolean;
  currentStage: string | null;
  paused: boolean;
  nextEmailAt: string | null;
}

export const useFinnEmailAutomation = (leadId: string) => {
  const [automation, setAutomation] = useState<EmailAutomationState>({
    enabled: false,
    currentStage: null,
    paused: false,
    nextEmailAt: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (leadId) {
      loadAutomationStatus();
    }
  }, [leadId]);

  const loadAutomationStatus = async () => {
    const status = await finnEmailService.getEmailAutomationStatus(leadId);
    setAutomation({
      enabled: status.enabled,
      currentStage: status.currentStage,
      paused: status.paused,
      nextEmailAt: status.nextEmailAt
    });
  };

  const toggleAutomation = async (enabled: boolean) => {
    setLoading(true);
    try {
      const result = await finnEmailService.toggleEmailAutomation(leadId, enabled);
      if (result.success) {
        setAutomation(prev => ({ ...prev, enabled }));
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const chooseOptimalChannel = async () => {
    return await finnEmailService.chooseOptimalChannel(leadId);
  };

  return {
    automation,
    loading,
    toggleAutomation,
    chooseOptimalChannel,
    refreshStatus: loadAutomationStatus
  };
};
