
import { supabase } from '@/integrations/supabase/client';

export interface MemoryEntry {
  content: string;
  memory_type: 'preference' | 'interaction' | 'insight';
  confidence: number;
}

export const extractAndStoreMemory = async (leadId: string, messageBody: string, direction: 'in' | 'out'): Promise<void> => {
  // Only process incoming messages for now
  if (direction !== 'in') return;

  try {
    const memories: MemoryEntry[] = [];

    // Simple keyword-based memory extraction
    const lowerMessage = messageBody.toLowerCase();

    // Extract preferences
    if (lowerMessage.includes('budget') || lowerMessage.includes('price') || lowerMessage.includes('afford')) {
      memories.push({
        content: `Budget concerns mentioned in: "${messageBody}"`,
        memory_type: 'preference',
        confidence: 0.7
      });
    }

    if (lowerMessage.includes('financing') || lowerMessage.includes('payment') || lowerMessage.includes('loan')) {
      memories.push({
        content: 'Interested in financing options',
        memory_type: 'preference',
        confidence: 0.8
      });
    }

    if (lowerMessage.includes('test drive') || lowerMessage.includes('see the car') || lowerMessage.includes('visit')) {
      memories.push({
        content: 'Interested in test driving',
        memory_type: 'preference',
        confidence: 0.9
      });
    }

    // Extract interaction patterns
    const responseTime = new Date().getHours();
    if (responseTime >= 9 && responseTime <= 17) {
      memories.push({
        content: 'Responds during business hours',
        memory_type: 'interaction',
        confidence: 0.6
      });
    }

    // Store memories in database
    for (const memory of memories) {
      await supabase
        .from('conversation_memory')
        .insert({
          lead_id: leadId,
          content: memory.content,
          memory_type: memory.memory_type,
          confidence: memory.confidence
        });
    }
  } catch (error) {
    console.error('Error storing conversation memory:', error);
  }
};

export const getLeadMemory = async (leadId: string) => {
  try {
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('lead_id', leadId)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching lead memory:', error);
    return [];
  }
};
