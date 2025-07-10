import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdvancedLeadScore {
  overall_score: number;
  component_scores: {
    engagement: number;
    intent_strength: number;
    conversion_probability: number;
    risk_factors: number;
  };
  lead_temperature: number;
  urgency_level: 'critical' | 'high' | 'medium' | 'low';
  conversion_timeline: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  key_insights: string[];
  risk_factors: string[];
  opportunities: string[];
  recommended_actions: Array<{
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    timing: 'immediate' | 'within_hour' | 'within_day' | 'within_week';
  }>;
  confidence_level: number;
  reasoning: string;
}

export interface FollowUpRecommendations {
  recommendations: Array<{
    id: string;
    action_type: 'call' | 'text' | 'email' | 'appointment' | 'inventory_share';
    priority: 'critical' | 'high' | 'medium' | 'low';
    timing: {
      suggested_delay_hours: number;
      optimal_time_of_day: 'morning' | 'afternoon' | 'evening';
      preferred_days: string[];
    };
    title: string;
    description: string;
    suggested_content: string;
    expected_outcome: string;
    success_metrics: string[];
  }>;
  strategy_summary: {
    approach: 'consultative' | 'urgent' | 'nurturing' | 'educational';
    key_focus_areas: string[];
    risk_mitigation: string[];
    success_probability: number;
  };
  personalization: {
    communication_style: 'professional' | 'casual' | 'friendly' | 'direct';
    key_interests: string[];
    pain_points: string[];
    motivators: string[];
  };
  confidence_level: number;
  reasoning: string;
}

export interface ConversationAnalysis {
  sentiment_analysis: {
    overall_sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
    emotional_indicators: {
      enthusiasm: number;
      frustration: number;
      satisfaction: number;
      trust: number;
    };
  };
  intent_analysis: {
    primary_intent: 'immediate_purchase' | 'researching' | 'price_comparison' | 'information_gathering' | 'browsing';
    intent_strength: number;
    timeline_indicators: {
      urgency_level: 'immediate' | 'within_week' | 'within_month' | 'undefined';
      decision_readiness: number;
    };
  };
  conversation_quality: {
    overall_quality: number;
    communication_effectiveness: number;
    information_gathering: number;
    relationship_building: number;
  };
  buying_signals: {
    explicit_signals: string[];
    implicit_signals: string[];
    readiness_score: number;
    conversion_probability: number;
  };
  conversation_summary: string;
  recommendations: Array<{
    type: 'immediate_action' | 'follow_up' | 'strategy_adjustment';
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
  }>;
  confidence_level: number;
}

export const useAdvancedAI = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeLeadScore = useCallback(async (leadId: string, includeHistory = true): Promise<AdvancedLeadScore | null> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('🧠 [useAdvancedAI] Starting lead scoring analysis...');
      
      const { data, error } = await supabase.functions.invoke('advanced-lead-scoring', {
        body: { leadId, includeHistory }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze lead score');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Lead scoring analysis failed');
      }

      console.log('✅ [useAdvancedAI] Lead scoring complete:', data.analysis.overall_score);
      return data.analysis;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ [useAdvancedAI] Lead scoring failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const generateFollowUpRecommendations = useCallback(async (
    leadId: string,
    contextType: 'post_conversation' | 'scheduled_check' | 'response_delay' | 're_engagement' = 'scheduled_check'
  ): Promise<FollowUpRecommendations | null> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('🤖 [useAdvancedAI] Generating follow-up recommendations...');
      
      const { data, error } = await supabase.functions.invoke('intelligent-follow-up', {
        body: { leadId, contextType, includeInventory: true }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate follow-up recommendations');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Follow-up recommendation generation failed');
      }

      console.log('✅ [useAdvancedAI] Follow-up recommendations generated:', data.recommendations.recommendations.length);
      return data.recommendations;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ [useAdvancedAI] Follow-up generation failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeConversation = useCallback(async (
    leadId: string,
    analysisType: 'real_time' | 'full_history' | 'recent_window' = 'recent_window',
    conversationId?: string
  ): Promise<ConversationAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('📊 [useAdvancedAI] Starting conversation analysis...');
      
      const { data, error } = await supabase.functions.invoke('conversation-analysis', {
        body: { leadId, conversationId, analysisType, includeRecommendations: true }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze conversation');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Conversation analysis failed');
      }

      console.log('✅ [useAdvancedAI] Conversation analysis complete:', data.analysis.conversation_quality?.overall_quality);
      return data.analysis;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ [useAdvancedAI] Conversation analysis failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Functions
    analyzeLeadScore,
    generateFollowUpRecommendations,
    analyzeConversation,
    clearError,
    
    // State
    isAnalyzing,
    error,
  };
};