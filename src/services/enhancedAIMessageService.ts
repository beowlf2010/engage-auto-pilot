
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const generateEnhancedAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    console.log('🤖 Starting AI message generation for lead:', leadId);
    
    // Check if it's within business hours (9 AM - 6 PM)
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 9 && hour <= 18;
    
    if (!isBusinessHours) {
      console.log('⏰ Outside business hours, but proceeding with generation');
    }

    // Get lead information first
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.error('❌ Error fetching lead data:', leadError);
      toast({
        title: "Error",
        description: "Could not fetch lead information",
        variant: "destructive"
      });
      return null;
    }

    console.log('📋 Lead data retrieved:', {
      name: `${leadData.first_name} ${leadData.last_name}`,
      vehicle: leadData.vehicle_interest,
      aiOptIn: leadData.ai_opt_in
    });

    // Call the AI generation function
    const { data, error } = await supabase.functions.invoke('generate-ai-message', {
      body: {
        leadId: leadId,
        stage: 'manual_generation',
        context: {
          trigger_type: 'manual',
          business_hours: isBusinessHours,
          timestamp: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      toast({
        title: "AI Generation Failed",
        description: error.message || "Failed to generate AI message",
        variant: "destructive"
      });
      return null;
    }

    if (!data || !data.message) {
      console.error('❌ No message returned from AI function');
      toast({
        title: "No Message Generated",
        description: "AI service returned empty response",
        variant: "destructive"
      });
      return null;
    }

    console.log('✅ AI message generated successfully:', data.message.substring(0, 50) + '...');
    
    toast({
      title: "AI Message Generated",
      description: "Message is ready for review and sending",
    });

    return data.message;

  } catch (error) {
    console.error('💥 Unexpected error in AI generation:', error);
    toast({
      title: "Generation Error",
      description: error instanceof Error ? error.message : "Unexpected error occurred",
      variant: "destructive"
    });
    return null;
  }
};
