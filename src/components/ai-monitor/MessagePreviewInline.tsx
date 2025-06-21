
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, RefreshCcw, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateInitialOutreachMessage } from '@/services/proactive/initialOutreachService';
import { sendMessage } from '@/services/messagesService';
import { toast } from '@/hooks/use-toast';

interface MessagePreviewInlineProps {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  aiStage: string;
  onMessageSent: () => void;
  onPreviewFull: () => void;
}

interface IssueType {
  value: string;
  label: string;
  description: string;
}

const issueTypes: IssueType[] = [
  { value: 'vehicle_inventory', label: 'Vehicle/Inventory Issue', description: 'Wrong vehicle mentioned or inventory mismatch' },
  { value: 'tone_style', label: 'Tone/Style Issue', description: 'Message tone or style needs adjustment' },
  { value: 'compliance', label: 'Compliance Issue', description: 'Potential compliance or legal concerns' },
  { value: 'content_accuracy', label: 'Content Accuracy', description: 'Factual errors or incorrect information' },
  { value: 'other', label: 'Other Issue', description: 'Other concerns not listed above' }
];

const MessagePreviewInline = ({ 
  leadId, 
  leadName, 
  vehicleInterest, 
  aiStage, 
  onMessageSent, 
  onPreviewFull 
}: MessagePreviewInlineProps) => {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [showIssueSelector, setShowIssueSelector] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [leadPhone, setLeadPhone] = useState<string>('');

  useEffect(() => {
    loadConversationHistory();
  }, [leadId]);

  useEffect(() => {
    if (conversationHistory !== null) {
      generatePreview();
    }
  }, [conversationHistory]);

  const loadConversationHistory = async () => {
    try {
      // Load conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      setConversationHistory(conversations || []);

      // Load lead phone number
      const { data: phoneData } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();

      if (phoneData?.number) {
        setLeadPhone(phoneData.number);
      } else {
        // Fallback: get any phone number for this lead
        const { data: anyPhone } = await supabase
          .from('phone_numbers')
          .select('number')
          .eq('lead_id', leadId)
          .limit(1)
          .single();
        
        setLeadPhone(anyPhone?.number || '');
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      setConversationHistory([]);
      setLeadPhone('');
    }
  };

  const generatePreview = async (issueContext?: string) => {
    setLoading(true);
    setError('');
    
    try {
      // Check for incoming customer messages (direction = 'in')
      const incomingMessages = conversationHistory.filter(msg => msg.direction === 'in');
      const isInitialContact = incomingMessages.length === 0;
      
      console.log(`🔄 [UNIFIED PREVIEW] Generating preview for ${leadName} - ${isInitialContact ? 'INITIAL CONTACT' : 'FOLLOW-UP'}`);
      console.log(`📞 [UNIFIED PREVIEW] Lead phone: ${leadPhone}`);

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
          setMessage(outreachResponse.message);
          console.log(`✅ [UNIFIED PREVIEW] Generated initial outreach: "${outreachResponse.message}"`);
        } else {
          throw new Error('Failed to generate initial outreach message');
        }
      } else {
        console.log(`🔄 [UNIFIED PREVIEW] Using conversation AI for follow-up`);
        
        // Prepare proper conversation context for follow-up
        const lastCustomerMessage = incomingMessages.slice(-1)[0];

        const conversationContext = conversationHistory
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
              phone: leadPhone,
              status: 'active',
              lastReplyAt: conversationHistory[conversationHistory.length - 1]?.sent_at || new Date().toISOString()
            },
            conversationLength: conversationHistory.length,
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
          setMessage(data.message);
          console.log(`✅ [UNIFIED PREVIEW] Generated follow-up message: "${data.message}"`);
        } else {
          throw new Error('No message generated by AI service');
        }
      }
      
    } catch (error) {
      console.error('❌ [UNIFIED PREVIEW] Error generating preview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Fallback message based on context
      const incomingMessages = conversationHistory.filter(msg => msg.direction === 'in');
      const isInitialContact = incomingMessages.length === 0;
      const fallbackMessage = isInitialContact 
        ? `Hi ${leadName.split(' ')[0]}! I'm Finn with Jason Pilger Chevrolet. I wanted to follow up on your interest in ${vehicleInterest}. What questions can I answer for you?`
        : `Thanks for your message! I'm here to help you with any questions about ${vehicleInterest}. What would you like to know?`;
      
      setMessage(fallbackMessage);
      console.log(`🔄 [UNIFIED PREVIEW] Using fallback message: "${fallbackMessage}"`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!message || sending) return;
    
    setSending(true);
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
      
      // Send the message using the messages service - explicitly ensure boolean type
      const isAIGenerated = true;
      const conversation = await sendMessage(leadId, message, profile, isAIGenerated);
      
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
      setSending(false);
    }
  };

  const handleRegenerateWithIssue = async () => {
    if (!selectedIssue) {
      setShowIssueSelector(true);
      return;
    }

    setRegenerating(true);
    const issueType = issueTypes.find(type => type.value === selectedIssue);
    await generatePreview(`Issue: ${issueType?.label} - ${issueType?.description}`);
    setRegenerating(false);
    setShowIssueSelector(false);
    setSelectedIssue('');
  };

  const getMessageQuality = (msg: string): { score: number; color: string } => {
    if (!msg || msg.includes('Error') || msg.includes('Unable') || error) {
      return { score: 0, color: 'text-red-600' };
    }
    
    // Simple quality heuristics
    const hasPersonalization = msg.toLowerCase().includes(leadName.split(' ')[0].toLowerCase());
    const hasVehicle = msg.toLowerCase().includes(vehicleInterest.toLowerCase());
    const goodLength = msg.length > 50 && msg.length < 300;
    const hasCall2Action = /\?|call|visit|appointment|interested|available/i.test(msg);
    const hasFinnIntro = msg.toLowerCase().includes('finn') && conversationHistory.filter(msg => msg.direction === 'in').length === 0;
    const hasJasonPilger = msg.toLowerCase().includes('jason pilger chevrolet');
    
    let score = 5;
    if (hasPersonalization) score += 1;
    if (hasVehicle) score += 1;
    if (goodLength) score += 1;
    if (hasCall2Action) score += 2;
    if (hasFinnIntro) score += 1;
    if (hasJasonPilger) score += 1;
    
    if (score >= 9) return { score, color: 'text-green-600' };
    if (score >= 7) return { score, color: 'text-yellow-600' };
    return { score, color: 'text-red-600' };
  };

  const quality = getMessageQuality(message);
  const incomingMessages = conversationHistory.filter(msg => msg.direction === 'in');
  const isInitialContact = incomingMessages.length === 0;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-sm">
              {isInitialContact ? 'Finn Introduction Preview (Jason Pilger Chevrolet)' : 'AI Follow-up Preview'}
            </span>
            <Badge variant="outline" className="text-xs">
              Quality: <span className={quality.color}>{quality.score}/11</span>
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviewFull}
            className="h-6 px-2"
          >
            <Eye className="w-3 h-3 mr-1" />
            Full View
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground italic">
            {isInitialContact ? 'Generating warm introduction from Finn at Jason Pilger Chevrolet...' : 'Generating follow-up message...'}
          </div>
        ) : error ? (
          <div className="space-y-2">
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {error}
            </div>
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Fallback Message:</strong><br />
              {message.length > 150 ? `${message.substring(0, 150)}...` : message}
            </div>
          </div>
        ) : (
          <div className="bg-muted p-3 rounded text-sm">
            {message.length > 150 ? `${message.substring(0, 150)}...` : message}
          </div>
        )}

        {/* Issue selector panel */}
        {showIssueSelector && (
          <div className="space-y-2 p-3 bg-yellow-50 rounded border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              What's the issue with this message?
            </div>
            <Select value={selectedIssue} onValueChange={setSelectedIssue}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((issue) => (
                  <SelectItem key={issue.value} value={issue.value}>
                    <div>
                      <div className="font-medium">{issue.label}</div>
                      <div className="text-xs text-muted-foreground">{issue.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRegenerateWithIssue}
                disabled={!selectedIssue || regenerating}
              >
                {regenerating ? 'Regenerating...' : 'Regenerate with Context'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowIssueSelector(false);
                  setSelectedIssue('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSendNow}
            disabled={!message || loading || sending || error}
            className="flex-1"
          >
            <Send className="w-3 h-3 mr-1" />
            {sending ? 'Sending...' : 'Send Now'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => generatePreview()}
            disabled={loading || regenerating || sending}
          >
            <RefreshCcw className="w-3 h-3 mr-1" />
            Regenerate
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIssueSelector(true)}
            disabled={loading || regenerating || sending}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Flag Issue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagePreviewInline;
