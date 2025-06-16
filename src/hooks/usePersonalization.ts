
import { useState, useEffect } from 'react';
import { analyzeLeadPersonality, getOptimalContactTiming, generatePersonalizedMessage } from '@/services/personalizationService';
import { getLeadBehavioralInsights, processPendingEnhancedTriggers } from '@/services/enhancedBehavioralService';

export const usePersonalization = (leadId?: string) => {
  const [personality, setPersonality] = useState<any>(null);
  const [behavioralInsights, setBehavioralInsights] = useState<any>(null);
  const [optimalTiming, setOptimalTiming] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPersonalizationData = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [personalityData, insightsData, timingData] = await Promise.all([
        analyzeLeadPersonality(id),
        getLeadBehavioralInsights(id),
        getOptimalContactTiming(id)
      ]);

      setPersonality(personalityData);
      setBehavioralInsights(insightsData);
      setOptimalTiming(timingData);
    } catch (error) {
      console.error('Error loading personalization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMessage = async (context?: any) => {
    if (!leadId) return null;
    return await generatePersonalizedMessage(leadId, context);
  };

  const processEnhancedTriggers = async () => {
    return await processPendingEnhancedTriggers();
  };

  useEffect(() => {
    if (leadId) {
      loadPersonalizationData(leadId);
    }
  }, [leadId]);

  return {
    personality,
    behavioralInsights,
    optimalTiming,
    loading,
    loadPersonalizationData,
    generateMessage,
    processEnhancedTriggers
  };
};
