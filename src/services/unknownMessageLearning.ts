import { supabase } from '@/integrations/supabase/client';

export interface UnknownMessageContext {
  conversationHistory: string;
  leadName: string;
  vehicleInterest: string;
  hasConversationalSignals: boolean;
  leadSource?: string;
}

class UnknownMessageLearning {
  async captureUnknownMessage(
    leadId: string,
    messageBody: string,
    context: UnknownMessageContext,
    reason: string
  ): Promise<void> {
    try {
      console.log('📝 [UNKNOWN MESSAGE LEARNING] Capturing unknown message scenario');
      
      // Try to store in database, but don't fail if database is unavailable
      const { error } = await supabase
        .from('ai_unknown_messages')
        .insert({
          lead_id: leadId,
          message_body: messageBody,
          context_data: context,
          failure_reason: reason,
          resolved: false
        });

      if (error) {
        console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Could not store unknown message (database may be unavailable):', error);
        // Store in local storage as fallback
        this.storeLocalFallback(leadId, messageBody, context, reason);
      } else {
        console.log('✅ [UNKNOWN MESSAGE LEARNING] Unknown message captured successfully');
      }
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error capturing unknown message:', error);
      this.storeLocalFallback(leadId, messageBody, context, reason);
    }
  }

  private storeLocalFallback(
    leadId: string,
    messageBody: string,
    context: UnknownMessageContext,
    reason: string
  ): void {
    try {
      const fallbackKey = 'finn_unknown_messages_fallback';
      const existing = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      
      existing.push({
        leadId,
        messageBody,
        context,
        reason,
        timestamp: new Date().toISOString()
      });

      // Keep only the last 50 entries
      if (existing.length > 50) {
        existing.splice(0, existing.length - 50);
      }

      localStorage.setItem(fallbackKey, JSON.stringify(existing));
      console.log('💾 [UNKNOWN MESSAGE LEARNING] Stored in local fallback');
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Could not store local fallback:', error);
    }
  }

  async checkForLearnedPatterns(messageBody: string): Promise<string | null> {
    try {
      console.log('🔍 [UNKNOWN MESSAGE LEARNING] Checking for learned patterns');
      
      // Query the database for learned responses
      const { data, error } = await supabase
        .from('ai_learned_responses')
        .select('*')
        .eq('resolved', true)
        .ilike('message_pattern', `%${messageBody.substring(0, 50)}%`)
        .limit(1)
        .single();

      if (error) {
        console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Could not query learned patterns (database may be unavailable):', error);
        return this.checkLocalFallback(messageBody);
      }

      if (data && data.learned_response) {
        console.log('🎯 [UNKNOWN MESSAGE LEARNING] Found learned pattern');
        return data.learned_response;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error checking learned patterns:', error);
      return this.checkLocalFallback(messageBody);
    }
  }

  private checkLocalFallback(messageBody: string): string | null {
    try {
      const fallbackKey = 'finn_learned_responses_fallback';
      const learned = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      
      const match = learned.find((response: any) => 
        messageBody.toLowerCase().includes(response.pattern.toLowerCase())
      );

      if (match) {
        console.log('💾 [UNKNOWN MESSAGE LEARNING] Found learned pattern in local fallback');
        return match.response;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Could not check local fallback:', error);
      return null;
    }
  }

  async markAsResolved(messageId: string, learnedResponse: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_unknown_messages')
        .update({ 
          resolved: true, 
          learned_response: learnedResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Could not mark as resolved:', error);
      } else {
        console.log('✅ [UNKNOWN MESSAGE LEARNING] Message marked as resolved');
      }
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error marking as resolved:', error);
    }
  }
}

export const unknownMessageLearning = new UnknownMessageLearning();
