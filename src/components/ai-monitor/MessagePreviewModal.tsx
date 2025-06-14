
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Clock, User, Car, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [loading, setLoading] = useState(false);
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMessageQualityScore = (message: string) => {
    let score = 100;
    if (message.length < 50) score -= 20;
    if (message.length > 160) score -= 15;
    if (!message.includes(leadContext?.firstName || '')) score -= 10;
    if (!message.toLowerCase().includes('call') && !message.toLowerCase().includes('visit')) score -= 10;
    return Math.max(score, 0);
  };

  const qualityScore = getMessageQualityScore(editedMessage || generatedMessage);

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Lead Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leadContext && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">{leadContext.firstName} {leadContext.lastName}</span>
                      <Badge variant="outline">{leadContext.aiStage}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Car className="h-3 w-3" />
                      {leadContext.vehicleInterest}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {leadContext.phoneNumber}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      {leadContext.messagesSent} messages sent
                    </div>

                    {leadContext.lastResponse && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Last Response:</p>
                          <p className="text-sm bg-muted p-2 rounded">{leadContext.lastResponse}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(leadContext.lastResponseTime!)}
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Conversation History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {leadContext?.conversationHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm ${
                        msg.direction === 'in'
                          ? 'bg-blue-50 border-l-2 border-blue-500'
                          : 'bg-gray-50 border-l-2 border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-xs">
                          {msg.direction === 'in' ? 'Customer' : msg.aiGenerated ? 'AI' : 'Manual'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.sentAt)}
                        </span>
                      </div>
                      <p>{msg.body}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Preview & Editing */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Generated Message
                  <div className="flex items-center gap-2">
                    <Badge variant={qualityScore >= 80 ? 'default' : qualityScore >= 60 ? 'secondary' : 'destructive'}>
                      Quality: {qualityScore}%
                    </Badge>
                    <Badge variant="outline">
                      {(editedMessage || generatedMessage).length}/160
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generating ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 animate-spin" />
                    Generating message...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded">
                      <p className="text-sm font-medium mb-1">Original Generated:</p>
                      <p>{generatedMessage}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Edit Message (Optional):
                      </label>
                      <Textarea
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        className="min-h-[100px]"
                        placeholder="Edit the message if needed..."
                      />
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Keep under 160 characters for SMS</p>
                      <p>• Include lead's name for personalization</p>
                      <p>• Add clear call-to-action</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
