
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiLearningService } from '@/services/aiLearningService';

export interface QueuedMessage {
  id: string;
  leadId: string;
  leadName: string;
  messageContent: string;
  stage: string;
  priority: 'high' | 'medium' | 'low';
  scheduledFor: Date;
  effectiveness_score?: number;
  learning_insights?: any;
  retry_count?: number;
  status: 'pending' | 'approved' | 'sent' | 'failed' | 'cancelled';
}

export const useSmartMessageQueue = () => {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(false);

  // Load queue with learning insights
  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      // Get pending messages from queue
      const { data: pendingMessages } = await supabase
        .from('ai_trigger_messages')
        .select(`
          *,
          leads!inner(first_name, last_name, ai_stage, vehicle_interest)
        `)
        .eq('approved', false)
        .is('sent_at', null)
        .order('generated_at', { ascending: true });

      if (pendingMessages) {
        const enrichedMessages = await Promise.all(
          pendingMessages.map(async (msg: any) => {
            // Get learning insights for this lead
            const insights = await aiLearningService.analyzeMessageEffectiveness(
              msg.message_content,
              msg.lead_id
            );

            // Calculate priority based on urgency and effectiveness
            const priority = calculateMessagePriority(msg.urgency_level, insights.effectivenessScore);

            return {
              id: msg.id,
              leadId: msg.lead_id,
              leadName: `${msg.leads.first_name} ${msg.leads.last_name}`,
              messageContent: msg.message_content,
              stage: msg.leads.ai_stage || 'follow_up',
              priority,
              scheduledFor: new Date(msg.generated_at),
              effectiveness_score: insights.effectivenessScore,
              learning_insights: insights,
              retry_count: 0,
              status: 'pending' as const
            };
          })
        );

        // Sort by priority and effectiveness
        enrichedMessages.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          
          if (priorityDiff !== 0) return priorityDiff;
          
          // If same priority, sort by effectiveness score
          return (b.effectiveness_score || 0) - (a.effectiveness_score || 0);
        });

        setQueuedMessages(enrichedMessages);
      }
    } catch (error) {
      console.error('Error loading smart queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate message priority based on multiple factors
  const calculateMessagePriority = (urgencyLevel: string, effectivenessScore: number): 'high' | 'medium' | 'low' => {
    if (urgencyLevel === 'high' || effectivenessScore > 80) return 'high';
    if (urgencyLevel === 'medium' || effectivenessScore > 60) return 'medium';
    return 'low';
  };

  // Approve message with learning feedback
  const approveMessage = useCallback(async (messageId: string, feedback?: any) => {
    try {
      await supabase
        .from('ai_trigger_messages')
        .update({ approved: true })
        .eq('id', messageId);

      // Submit feedback if provided
      if (feedback) {
        const message = queuedMessages.find(m => m.id === messageId);
        if (message) {
          await aiLearningService.submitMessageFeedback({
            leadId: message.leadId,
            messageContent: message.messageContent,
            feedbackType: feedback.type,
            rating: feedback.rating,
            improvementSuggestions: feedback.suggestions
          });
        }
      }

      setQueuedMessages(prev => prev.filter(m => m.id !== messageId));
      await loadQueue(); // Reload to get updated queue
    } catch (error) {
      console.error('Error approving message:', error);
    }
  }, [queuedMessages, loadQueue]);

  // Reject message with learning feedback
  const rejectMessage = useCallback(async (messageId: string, reason: string) => {
    try {
      await supabase
        .from('ai_trigger_messages')
        .delete()
        .eq('id', messageId);

      const message = queuedMessages.find(m => m.id === messageId);
      if (message) {
        await aiLearningService.submitMessageFeedback({
          leadId: message.leadId,
          messageContent: message.messageContent,
          feedbackType: 'negative',
          rating: 1,
          regenerationReason: reason
        });
      }

      setQueuedMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error rejecting message:', error);
    }
  }, [queuedMessages]);

  // Auto-approve high-performing messages
  const processAutoApprovals = useCallback(async () => {
    if (!autoApprovalEnabled) return;

    const highPerformingMessages = queuedMessages.filter(
      msg => msg.effectiveness_score && msg.effectiveness_score > 85 && msg.priority === 'high'
    );

    for (const message of highPerformingMessages) {
      await approveMessage(message.id, {
        type: 'positive',
        rating: 5,
        suggestions: 'Auto-approved based on high effectiveness score'
      });
    }
  }, [queuedMessages, autoApprovalEnabled, approveMessage]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    processAutoApprovals();
  }, [processAutoApprovals]);

  return {
    queuedMessages,
    loading,
    autoApprovalEnabled,
    setAutoApprovalEnabled,
    loadQueue,
    approveMessage,
    rejectMessage
  };
};
