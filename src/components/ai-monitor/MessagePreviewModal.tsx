
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LeadContextCard from './LeadContextCard';
import ConversationHistory from './ConversationHistory';
import MessageEditor from './MessageEditor';
import { getMessageQualityScore, formatTime } from './messageUtils';

interface MessagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  onApprove: (message: string) => void;
  onReject: () => void;
}

interface LeadContext {
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  phoneNumber: string;
  aiStage: string;
  messagesSent: number;
  lastResponse?: string;
  lastResponseTime?: string;
  conversationHistory: Array<{
    body: string;
    direction: 'in' | 'out';
    sentAt: string;
    aiGenerated: boolean;
  }>;
}

const MessagePreviewModal = ({ open, onClose, leadId, onApprove, onReject }: MessagePreviewModalProps) => {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [leadContext, setLeadContext] = useState<LeadContext | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && leadId) {
      loadLeadContext();
      generatePreviewMessage();
    }
  }, [open, leadId]);

  const loadLeadContext = async () => {
    try {
      // Get lead details
      const { data: lead } = await supabase
        .from('leads')
        .select(`
          first_name,
          last_name,
          vehicle_interest,
          ai_stage,
          ai_messages_sent,
          phone_numbers (number, is_primary)
        `)
        .eq('id', leadId)
        .single();

      // Get conversation history
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('body, direction, sent_at, ai_generated')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(5);

      if (lead) {
        const lastIncoming = conversationsData?.find(c => c.direction === 'in');
        
        // Transform the conversation data to match the expected interface
        const conversationHistory = conversationsData?.map(conv => ({
          body: conv.body,
          direction: conv.direction as 'in' | 'out',
          sentAt: conv.sent_at,
          aiGenerated: conv.ai_generated
        })) || [];
        
        setLeadContext({
          firstName: lead.first_name,
          lastName: lead.last_name,
          vehicleInterest: lead.vehicle_interest,
          phoneNumber: lead.phone_numbers?.find(p => p.is_primary)?.number || 'N/A',
          aiStage: lead.ai_stage || 'initial',
          messagesSent: lead.ai_messages_sent || 0,
          lastResponse: lastIncoming?.body,
          lastResponseTime: lastIncoming?.sent_at,
          conversationHistory
        });
      }
    } catch (error) {
      console.error('Error loading lead context:', error);
    }
  };

  const generatePreviewMessage = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-message', {
        body: {
          leadId,
          stage: leadContext?.aiStage || 'follow_up',
          context: { preview: true }
        }
      });

      if (error) throw error;

      const message = data?.message || '';
      setGeneratedMessage(message);
      setEditedMessage(message);
    } catch (error) {
      console.error('Error generating preview message:', error);
      setGeneratedMessage('Unable to generate preview message');
      setEditedMessage('');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = () => {
    onApprove(editedMessage || generatedMessage);
    onClose();
  };

  const qualityScore = getMessageQualityScore(editedMessage || generatedMessage, leadContext);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Message Preview
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Context */}
          <div className="space-y-4">
            <LeadContextCard leadContext={leadContext} formatTime={formatTime} />
            <ConversationHistory 
              conversationHistory={leadContext?.conversationHistory || []} 
              formatTime={formatTime} 
            />
          </div>

          {/* Message Preview & Editing */}
          <div className="space-y-4">
            <MessageEditor
              generatedMessage={generatedMessage}
              editedMessage={editedMessage}
              setEditedMessage={setEditedMessage}
              generating={generating}
              qualityScore={qualityScore}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onReject}>
            Skip This Lead
          </Button>
          <Button variant="outline" onClick={generatePreviewMessage} disabled={generating}>
            Regenerate
          </Button>
          <Button onClick={handleApprove} disabled={generating || !generatedMessage}>
            Approve & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessagePreviewModal;
