import { supabase } from '@/integrations/supabase/client';

export interface CallTranscription {
  id: string;
  call_log_id: string;
  lead_id: string;
  recording_url?: string;
  transcript_text?: string;
  transcript_confidence?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CallAnalysis {
  id: string;
  call_log_id: string;
  lead_id: string;
  transcript_id: string;
  sentiment_score?: number;
  emotion_detected?: string;
  intent_detected?: string;
  topics_discussed?: string[];
  objections_raised?: Array<{
    text: string;
    confidence: number;
    type: string;
  }>;
  buying_signals?: Array<{
    text: string;
    confidence: number;
    strength: string;
  }>;
  next_actions?: Array<{
    action: string;
    priority: string;
    timeline: string;
  }>;
  conversation_summary?: string;
  ai_recommendations?: string;
  quality_score?: number;
  talk_time_ratio?: number;
  engagement_level?: 'low' | 'medium' | 'high';
  call_outcome_prediction?: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface CallInsight {
  id: string;
  call_log_id: string;
  lead_id: string;
  insight_type: 'objection' | 'buying_signal' | 'concern' | 'opportunity' | 'follow_up';
  insight_text: string;
  confidence_score?: number;
  timestamp_in_call?: number;
  actionable: boolean;
  action_taken: boolean;
  created_at: string;
}

export class VoiceAIService {
  private static instance: VoiceAIService;

  static getInstance(): VoiceAIService {
    if (!VoiceAIService.instance) {
      VoiceAIService.instance = new VoiceAIService();
    }
    return VoiceAIService.instance;
  }

  // Start transcription process for a call recording
  async startTranscription(callLogId: string, recordingUrl: string, leadId: string): Promise<string> {
    console.log('🎙️ [VOICE AI] Starting transcription for call:', callLogId);

    const { data, error } = await supabase.functions.invoke('voice-ai-transcription', {
      body: {
        callLogId,
        recordingUrl,
        leadId
      }
    });

    if (error) {
      console.error('Failed to start transcription:', error);
      throw error;
    }

    return data.transcriptionId;
  }

  // Start conversation analysis for a completed transcription
  async startConversationAnalysis(transcriptId: string, callLogId: string, leadId: string): Promise<string> {
    console.log('🤖 [VOICE AI] Starting conversation analysis for transcript:', transcriptId);

    const { data, error } = await supabase.functions.invoke('voice-ai-conversation-analysis', {
      body: {
        transcriptId,
        callLogId,
        leadId
      }
    });

    if (error) {
      console.error('Failed to start conversation analysis:', error);
      throw error;
    }

    return data.analysisId;
  }

  // Get transcription by call log ID
  async getTranscriptionByCallLog(callLogId: string): Promise<CallTranscription | null> {
    const { data, error } = await supabase
      .from('call_transcriptions')
      .select('*')
      .eq('call_log_id', callLogId)
      .single();

    if (error) {
      console.error('Failed to get transcription:', error);
      return null;
    }

    return data as CallTranscription;
  }

  // Get conversation analysis by transcript ID
  async getConversationAnalysis(transcriptId: string): Promise<CallAnalysis | null> {
    const { data, error } = await supabase
      .from('call_conversation_analysis')
      .select('*')
      .eq('transcript_id', transcriptId)
      .single();

    if (error) {
      console.error('Failed to get conversation analysis:', error);
      return null;
    }

    return data as CallAnalysis;
  }

  // Get call insights for a specific call
  async getCallInsights(callLogId: string): Promise<CallInsight[]> {
    const { data, error } = await supabase
      .from('call_insights')
      .select('*')
      .eq('call_log_id', callLogId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get call insights:', error);
      return [];
    }

    return data as CallInsight[];
  }

  // Get all call analyses for a lead
  async getLeadCallAnalyses(leadId: string): Promise<CallAnalysis[]> {
    const { data, error } = await supabase
      .from('call_conversation_analysis')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get lead call analyses:', error);
      return [];
    }

    return data as CallAnalysis[];
  }

  // Get sentiment trends for a lead
  async getSentimentTrends(leadId: string): Promise<Array<{
    date: string;
    sentiment: number;
    emotion: string;
    engagement: string;
  }>> {
    const { data, error } = await supabase
      .from('call_conversation_analysis')
      .select('created_at, sentiment_score, emotion_detected, engagement_level')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to get sentiment trends:', error);
      return [];
    }

    return data.map(item => ({
      date: item.created_at,
      sentiment: item.sentiment_score || 0,
      emotion: item.emotion_detected || 'neutral',
      engagement: item.engagement_level || 'medium'
    }));
  }

  // Mark insight as acted upon
  async markInsightActionTaken(insightId: string): Promise<void> {
    const { error } = await supabase
      .from('call_insights')
      .update({ 
        action_taken: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', insightId);

    if (error) {
      console.error('Failed to mark insight action taken:', error);
      throw error;
    }
  }

  // Get call quality analytics
  async getCallQualityAnalytics(dateRange: { start: Date; end: Date }): Promise<{
    averageQualityScore: number;
    averageSentiment: number;
    topObjections: Array<{ text: string; count: number }>;
    buyingSignalTrends: Array<{ date: string; count: number }>;
    engagementDistribution: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('call_conversation_analysis')
      .select('*')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    if (error) {
      console.error('Failed to get call quality analytics:', error);
      return {
        averageQualityScore: 0,
        averageSentiment: 0,
        topObjections: [],
        buyingSignalTrends: [],
        engagementDistribution: {}
      };
    }

    const analyses = data as CallAnalysis[];

    // Calculate averages
    const averageQualityScore = analyses.reduce((sum, a) => sum + (a.quality_score || 0), 0) / analyses.length;
    const averageSentiment = analyses.reduce((sum, a) => sum + (a.sentiment_score || 0), 0) / analyses.length;

    // Top objections
    const objectionCounts: Record<string, number> = {};
    analyses.forEach(analysis => {
      analysis.objections_raised?.forEach(obj => {
        objectionCounts[obj.text] = (objectionCounts[obj.text] || 0) + 1;
      });
    });

    const topObjections = Object.entries(objectionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));

    // Engagement distribution
    const engagementDistribution = analyses.reduce((dist, analysis) => {
      const level = analysis.engagement_level || 'medium';
      dist[level] = (dist[level] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    // Buying signal trends (simplified - daily counts)
    const buyingSignalTrends = analyses
      .filter(a => a.buying_signals && a.buying_signals.length > 0)
      .reduce((trends, analysis) => {
        const date = analysis.created_at.split('T')[0];
        const existing = trends.find(t => t.date === date);
        if (existing) {
          existing.count += analysis.buying_signals?.length || 0;
        } else {
          trends.push({ date, count: analysis.buying_signals?.length || 0 });
        }
        return trends;
      }, [] as Array<{ date: string; count: number }>);

    return {
      averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      averageSentiment: Math.round(averageSentiment * 100) / 100,
      topObjections,
      buyingSignalTrends,
      engagementDistribution
    };
  }
}

export const voiceAIService = VoiceAIService.getInstance();