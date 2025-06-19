
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiLearningService } from '@/services/aiLearningService';
import { toast } from '@/hooks/use-toast';

export const useRealtimeLearning = (leadId?: string) => {
  const [learningInsights, setLearningInsights] = useState<any>(null);
  const [isLearning, setIsLearning] = useState(false);

  // Listen for new feedback in real-time
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`learning-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_message_feedback'
        },
        async (payload) => {
          if (payload.new.lead_id === leadId) {
            console.log('New learning feedback received:', payload.new);
            
            // Update insights in real-time
            try {
              const analysis = await aiLearningService.analyzeMessageEffectiveness('', leadId);
              setLearningInsights(analysis);
              
              toast({
                title: "AI Learning Update",
                description: "New feedback has been processed to improve future messages",
              });
            } catch (error) {
              console.error('Error updating learning insights:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  // Auto-track message outcomes
  const trackMessageOutcome = async (messageContent: string, outcome: 'response' | 'no_response' | 'appointment') => {
    if (!leadId) return;

    try {
      setIsLearning(true);
      
      const outcomeType = outcome === 'response' ? 'no_response' : 
                         outcome === 'appointment' ? 'appointment_booked' : 'no_response';
      
      await aiLearningService.trackLearningOutcome({
        leadId,
        outcomeType,
        messageCharacteristics: {
          length: messageContent.length,
          hasInventory: messageContent.toLowerCase().includes('car') || messageContent.toLowerCase().includes('vehicle'),
          hasPrice: messageContent.includes('$'),
          timeOfDay: new Date().getHours()
        }
      });

      // Update insights
      const analysis = await aiLearningService.analyzeMessageEffectiveness(messageContent, leadId);
      setLearningInsights(analysis);
      
    } catch (error) {
      console.error('Error tracking message outcome:', error);
    } finally {
      setIsLearning(false);
    }
  };

  return {
    learningInsights,
    isLearning,
    trackMessageOutcome
  };
};
