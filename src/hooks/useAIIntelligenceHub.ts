import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AINotification {
  id: string;
  lead_id: string;
  notification_type: string;
  title: string;
  message: string;
  urgency_level: string;
  ai_confidence: number;
  metadata: any;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface ChurnPrediction {
  id: string;
  lead_id: string;
  churn_probability: number;
  risk_level: string;
  contributing_factors: any;
  recommended_interventions: any;
  prediction_confidence: number;
  days_until_predicted_churn: number | null;
  predicted_at: string;
}

export interface InventoryMatch {
  id: string;
  lead_id: string;
  inventory_id: string;
  match_score: number;
  match_reasons: any;
  personalized_pitch: string;
  confidence_level: number;
  lead_preferences: any;
  vehicle_highlights: any;
  pricing_strategy: any;
  match_type: string;
  created_at: string;
  inventory?: any;
}

export interface GeneratedMessage {
  id: string;
  lead_id: string;
  message_type: string;
  generated_content: string;
  personalization_factors: any;
  tone_style: string;
  ai_confidence: number;
  human_approved: boolean;
  created_at: string;
}

export const useAIIntelligenceHub = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifications, setNotifications] = useState<AINotification[]>([]);
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [inventoryMatches, setInventoryMatches] = useState<InventoryMatch[]>([]);
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real-time subscriptions
  useEffect(() => {
    console.log('🔄 [useAIIntelligenceHub] Setting up real-time subscriptions...');
    
    // Subscribe to AI notifications
    const notificationsChannel = supabase
      .channel('ai-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_notifications' },
        (payload) => {
          console.log('🔔 [useAIIntelligenceHub] New notification:', payload.new);
          const newNotification = payload.new as AINotification;
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast for high-priority notifications
          if (newNotification.urgency_level === 'critical' || newNotification.urgency_level === 'high') {
            toast({
              title: "🤖 AI Insight",
              description: newNotification.title,
              variant: newNotification.urgency_level === 'critical' ? 'destructive' : 'default',
            });
          }
        }
      )
      .subscribe();

    // Subscribe to churn predictions
    const churnChannel = supabase
      .channel('ai-churn-predictions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_churn_predictions' },
        (payload) => {
          console.log('⚠️ [useAIIntelligenceHub] Churn prediction update:', payload);
          if (payload.eventType === 'INSERT') {
            setChurnPredictions(prev => [payload.new as ChurnPrediction, ...prev]);
          }
        }
      )
      .subscribe();

    // Subscribe to inventory matches
    const matchesChannel = supabase
      .channel('ai-inventory-matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_inventory_matches' },
        (payload) => {
          console.log('🎯 [useAIIntelligenceHub] Inventory match update:', payload);
          if (payload.eventType === 'INSERT') {
            setInventoryMatches(prev => [payload.new as InventoryMatch, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(churnChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [toast]);

  const runAIAnalysis = useCallback(async (
    leadId: string,
    operations: ('churn_analysis' | 'inventory_matching' | 'message_generation' | 'notifications')[],
    context?: any
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log(`🧠 [useAIIntelligenceHub] Starting AI analysis for lead: ${leadId}`);
      
      const { data, error } = await supabase.functions.invoke('ai-intelligence-hub', {
        body: { leadId, operations, context }
      });

      if (error) {
        throw new Error(error.message || 'Failed to run AI analysis');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'AI analysis failed');
      }

      console.log('✅ [useAIIntelligenceHub] AI analysis complete:', data.results);
      
      toast({
        title: "🤖 AI Analysis Complete",
        description: `Completed ${operations.length} AI operation${operations.length > 1 ? 's' : ''} for the lead.`,
      });

      return data.results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ [useAIIntelligenceHub] AI analysis failed:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "AI Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const loadNotifications = useCallback(async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('ai_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const loadChurnPredictions = useCallback(async (leadId?: string) => {
    try {
      let query = supabase
        .from('ai_churn_predictions')
        .select('*')
        .order('predicted_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setChurnPredictions(data || []);
    } catch (err) {
      console.error('Failed to load churn predictions:', err);
    }
  }, []);

  const loadInventoryMatches = useCallback(async (leadId?: string) => {
    try {
      let query = supabase
        .from('ai_inventory_matches')
        .select(`
          *,
          inventory(*)
        `)
        .order('match_score', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setInventoryMatches(data || []);
    } catch (err) {
      console.error('Failed to load inventory matches:', err);
    }
  }, []);

  const loadGeneratedMessages = useCallback(async (leadId?: string) => {
    try {
      let query = supabase
        .from('ai_generated_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setGeneratedMessages(data || []);
    } catch (err) {
      console.error('Failed to load generated messages:', err);
    }
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const approveMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('ai_generated_messages')
        .update({ 
          human_approved: true,
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', messageId);

      if (error) throw error;

      setGeneratedMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, human_approved: true } : m)
      );

      toast({
        title: "Message Approved",
        description: "AI-generated message has been approved for sending.",
      });
    } catch (err) {
      console.error('Failed to approve message:', err);
    }
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Functions
    runAIAnalysis,
    loadNotifications,
    loadChurnPredictions,
    loadInventoryMatches,
    loadGeneratedMessages,
    markNotificationRead,
    approveMessage,
    clearError,

    // State
    isProcessing,
    notifications,
    churnPredictions,
    inventoryMatches,
    generatedMessages,
    error,

    // Computed
    unreadNotifications: notifications.filter(n => !n.read_at),
    highRiskLeads: churnPredictions.filter(p => p.risk_level === 'critical' || p.risk_level === 'high'),
    pendingApprovals: generatedMessages.filter(m => !m.human_approved),
  };
};