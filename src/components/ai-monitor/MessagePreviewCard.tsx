
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { generateInitialOutreachMessage } from '@/services/proactive/initialOutreachService';
import { sendMessage } from '@/services/messagesService';
import { toast } from '@/hooks/use-toast';
import MessagePreviewHeader from './components/MessagePreviewHeader';
import MessagePreviewContent from './components/MessagePreviewContent';
import IssueSelector from './components/IssueSelector';
import MessagePreviewActions from './components/MessagePreviewActions';
import { MessagePreviewInlineProps, IssueType, MessagePreviewState } from './types/messagePreviewTypes';
import { getMessageQuality } from './utils/messagePreviewUtils';

const issueTypes: IssueType[] = [
  { value: 'vehicle_inventory', label: 'Vehicle/Inventory Issue', description: 'Wrong vehicle mentioned or inventory mismatch' },
  { value: 'tone_style', label: 'Tone/Style Issue', description: 'Message tone or style needs adjustment' },
  { value: 'compliance', label: 'Compliance Issue', description: 'Potential compliance or legal concerns' },
  { value: 'content_accuracy', label: 'Content Accuracy', description: 'Factual errors or incorrect information' },
  { value: 'other', label: 'Other Issue', description: 'Other concerns not listed above' }
];

const MessagePreviewCard = ({ 
  leadId, 
  leadName, 
  vehicleInterest, 
  aiStage, 
  onMessageSent, 
  onPreviewFull 
}: MessagePreviewInlineProps) => {
  const [state, setState] = useState<MessagePreviewState>({
    message: '',
    loading: false,
    regenerating: false,
    sending: false,
    selectedIssue: '',
    showIssueSelector: false,
    conversationHistory: [],
    error: '',
    leadPhone: ''
  });

  useEffect(() => {
    loadConversationHistory();
  }, [leadId]);

  useEffect(() => {
    if (state.conversationHistory !== null) {
      generatePreview();
    }
  }, [state.conversationHistory]);

  const loadConversationHistory = async () => {
    try {
      // Load conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      setState(prev => ({ ...prev, conversationHistory: conversations || [] }));

      // Load lead phone number
      const { data: phoneData } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();

      if (phoneData?.number) {
        setState(prev => ({ ...prev, leadPhone: phoneData.number }));
      } else {
        // Fallback: get any phone number for this lead
        const { data: anyPhone } = await supabase
          .from('phone_numbers')
          .select('number')
          .eq('lead_id', leadId)
          .limit(1)
          .single();
        
        setState(prev => ({ ...prev, leadPhone: anyPhone?.number || '' }));
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      setState(prev => ({ 
        ...prev, 
        conversationHistory: [],
        leadPhone: ''
      }));
    }
  };

  const generatePreview = async (issueContext?: string) => {
    setState(prev => ({ ...prev, loading: true, error: '' }));
    
    try {
      // Check for incoming customer messages (direction = 'in')
      const incomingMessages = state.conversationHistory.filter(msg => msg.direction === 'in');
      const isInitialContact = incomingMessages.length === 0;
      
      console.log(`🔄 [UNIFIED PREVIEW] Generating preview for ${leadName} - ${isInitialContact ? 'INITIAL CONTACT' : 'FOLLOW-UP'}`);
      console.log(`📞 [UNIFIED PREVIEW] Lead phone: ${state.leadPhone}`);

      if (isInitialContact) {
        console.log(`🚀 [UNIFIED PREVIEW] Using initial outreach service`);
        
        const [firstName, ...lastNameParts] = leadName.split(' ');
        const lastName = lastNameParts.join(' ');

        const outreachResponse = await generateInitialOutreachMessage({
          leadId,
          firstName,
          lastName,
          vehicleInterest,
          salespersonName: 'Finn',
          dealershipName: 'Jason Pilger Chevrolet'
        });

        if (outreachResponse?.message) {
          setState(prev => ({ ...prev, message: outreachResponse.message }));
          console.log(`✅ [UNIFIED PREVIEW] Generated initial outreach: "${outreachResponse.message}"`);
        } else {
          throw new Error('Failed to generate initial outreach message');
        }
      } else {
        console.log(`🔄 [UNIFIED PREVIEW] Using conversation AI for follow-up`);
        
        // Prepare proper conversation context for follow-up
        const lastCustomerMessage = incomingMessages.slice(-1)[0];

        const conversationContext = state.conversationHistory
          .map(msg => `${msg.direction === 'in' ? 'Customer' : 'You'}: ${msg.body}`)
          .join('\n');

        const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
          body: {
            leadId,
            leadName,
            messageBody: lastCustomerMessage?.body || 'No recent customer message',
            vehicleInterest: vehicleInterest || 'finding the right vehicle',
            lastCustomerMessage: lastCustomerMessage?.body || '',
            conversationHistory: conversationContext,
            leadInfo: {
              phone: state.leadPhone,
              status: 'active',
              lastReplyAt: state.conversationHistory[state.conversationHistory.length - 1]?.sent_at || new Date().toISOString()
            },
            conversationLength: state.conversationHistory.length,
            inventoryStatus: {
              hasInventory: true,
              totalVehicles: 20
            },
            isInitialContact: false,
            salespersonName: 'Finn',
            dealershipName: 'Jason Pilger Chevrolet',
            context: {
              preview: true,
              issueContext: issueContext || undefined,
              regeneration: !!issueContext
            }
          }
        });

        if (error) {
          console.error('❌ [UNIFIED PREVIEW] Edge function error:', error);
          throw new Error(`AI service error: ${error.message || 'Unknown error'}`);
        }
        
        if (data?.message) {
          setState(prev => ({ ...prev, message: data.message }));
          console.log(`✅ [UNIFIED PREVIEW] Generated follow-up message: "${data.message}"`);
        } else {
          throw new Error('No message generated by AI service');
        }
      }
      
    } catch (error) {
      console.error('❌ [UNIFIED PREVIEW] Error generating preview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Fallback message based on context
      const incomingMessages = state.conversationHistory.filter(msg => msg.direction === 'in');
      const isInitialContact = incomingMessages.length === 0;
      const fallbackMessage = isInitialContact 
        ? `Hi ${leadName.split(' ')[0]}! I'm Finn with Jason Pilger Chevrolet. I wanted to follow up on your interest in ${vehicleInterest}. What questions can I answer for you?`
        : `Thanks for your message! I'm here to help you with any questions about ${vehicleInterest}. What would you like to know?`;
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        message: fallbackMessage
      }));
      console.log(`🔄 [UNIFIED PREVIEW] Using fallback message: "${fallbackMessage}"`);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSendNow = async () => {
    if (!state.message || state.sending) return;
    
    setState(prev => ({ ...prev, sending: true }));
    try {
      console.log(`📤 [MESSAGE PREVIEW] Sending message for lead ${leadId}`);
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('No user profile found');
      
      // Send the message using the messages service - explicitly cast to boolean
      const conversation = await sendMessage(leadId, state.message, profile, true as boolean);
      
      if (conversation) {
        console.log(`✅ [MESSAGE PREVIEW] Message sent successfully`);
        
        // Update lead AI scheduling
        const nextSendTime = new Date();
        nextSendTime.setTime(nextSendTime.getTime() + (24 * 60 * 60 * 1000));

        await supabase
          .from('leads')
          .update({
            ai_stage: 'initial_contact_sent',
            next_ai_send_at: nextSendTime.toISOString(),
            pending_human_response: false
          })
          .eq('id', leadId);
        
        toast({
          title: "Message Sent",
          description: `AI message sent successfully to ${leadName}. Lead status updated to engaged.`,
        });
        
        // Trigger the callback to refresh the queue
        onMessageSent();
      }
      
    } catch (error) {
      console.error('❌ [MESSAGE PREVIEW] Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, sending: false }));
    }
  };

  const handleRegenerateWithIssue = async () => {
    if (!state.selectedIssue) {
      setState(prev => ({ ...prev, showIssueSelector: true }));
      return;
    }

    setState(prev => ({ ...prev, regenerating: true }));
    const issueType = issueTypes.find(type => type.value === state.selectedIssue);
    await generatePreview(`Issue: ${issueType?.label} - ${issueType?.description}`);
    setState(prev => ({ 
      ...prev, 
      regenerating: false,
      showIssueSelector: false,
      selectedIssue: ''
    }));
  };

  const quality = getMessageQuality(state.message, leadName, vehicleInterest, state.error, state.conversationHistory);
  const incomingMessages = state.conversationHistory.filter(msg => msg.direction === 'in');
  const isInitialContact = incomingMessages.length === 0;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4 space-y-3">
        <MessagePreviewHeader 
          isInitialContact={isInitialContact}
          quality={quality}
          onPreviewFull={onPreviewFull}
        />

        <MessagePreviewContent 
          loading={state.loading}
          isInitialContact={isInitialContact}
          error={state.error}
          message={state.message}
        />

        <IssueSelector 
          showIssueSelector={state.showIssueSelector}
          selectedIssue={state.selectedIssue}
          regenerating={state.regenerating}
          issueTypes={issueTypes}
          onIssueChange={(value) => setState(prev => ({ ...prev, selectedIssue: value }))}
          onRegenerateWithIssue={handleRegenerateWithIssue}
          onCancel={() => setState(prev => ({ 
            ...prev, 
            showIssueSelector: false,
            selectedIssue: ''
          }))}
        />

        <MessagePreviewActions 
          message={state.message}
          loading={state.loading}
          sending={state.sending}
          regenerating={state.regenerating}
          error={state.error}
          onSendNow={handleSendNow}
          onRegenerate={() => generatePreview()}
          onFlagIssue={() => setState(prev => ({ ...prev, showIssueSelector: true }))}
        />
      </CardContent>
    </Card>
  );
};

export default MessagePreviewCard;
