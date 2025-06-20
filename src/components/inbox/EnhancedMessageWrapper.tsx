
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { sendEnhancedMessage } from '@/services/enhancedMessagesService';

interface EnhancedMessageWrapperProps {
  onMessageSent: (leadId: string) => Promise<void>;
  onLeadsRefresh: () => void;
}

export const useEnhancedMessageWrapper = ({ onMessageSent, onLeadsRefresh }: EnhancedMessageWrapperProps) => {
  const { profile } = useAuth();

  const sendEnhancedMessageWrapper = async (leadId: string, messageText: string) => {
    if (!profile || !messageText.trim()) {
      const error = 'Missing profile or message text';
      console.error('❌ [SMART INBOX] Enhanced send failed:', error);
      
      // Use global debug function if available
      if ((window as any).debugLog) {
        (window as any).debugLog('error', 'Smart Inbox', 'Send Message Failed', { 
          error, 
          hasProfile: !!profile, 
          messageLength: messageText?.length || 0 
        });
      }
      
      throw new Error(error);
    }

    try {
      console.log('📤 [SMART INBOX] Using enhanced message service');
      
      const result = await sendEnhancedMessage({
        leadId,
        messageBody: messageText.trim(),
        profile,
        isAIGenerated: false
      });

      if (!result.success) {
        throw new Error(result.error || 'Enhanced message sending failed');
      }

      // Reload messages to show the new message
      await onMessageSent(leadId);
      
      // Trigger leads refresh
      onLeadsRefresh();
      
      console.log('✅ [SMART INBOX] Enhanced message sent successfully');
      
    } catch (err: any) {
      console.error('❌ [SMART INBOX] Enhanced send error:', err);
      
      // Use global debug function if available
      if ((window as any).debugLog) {
        (window as any).debugLog('error', 'Smart Inbox', 'Enhanced Send Failed', { 
          leadId, 
          error: err.message,
          profileId: profile?.id 
        });
      }
      
      throw err;
    }
  };

  return { sendEnhancedMessageWrapper };
};
