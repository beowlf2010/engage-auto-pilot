
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, RefreshCcw, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateInitialOutreachMessage } from '@/services/proactive/initialOutreachService';
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
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [showIssueSelector, setShowIssueSelector] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

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
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      setConversationHistory(conversations || []);
    } catch (error) {
      console.error('Error loading conversation history:', error);
      setConversationHistory([]);
    }
  };

  const generatePreview = async (issueContext?: string) => {
    setLoading(true);
    try {
      const isInitialContact = conversationHistory.length === 0;
      
      console.log(`🔄 [UNIFIED PREVIEW] Generating preview for ${leadName} - ${isInitialContact ? 'INITIAL CONTACT' : 'FOLLOW-UP'}`);

      if (isInitialContact) {
        // Use initial outreach service for first-time contact
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
        // Use the unified intelligent-conversation-ai function for follow-ups
        console.log(`🔄 [UNIFIED PREVIEW] Using conversation AI for follow-up`);
        
        const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
          body: {
            leadId,
            leadName,
            vehicleInterest,
            lastCustomerMessage: conversationHistory.filter(msg => msg.direction === 'in').slice(-1)[0]?.body || '',
            conversationHistory: conversationHistory.map(msg => `${msg.direction === 'in' ? 'Customer' : 'You'}: ${msg.body}`).join('\n') || '',
            leadInfo: {
              phone: '',
              status: 'active',
              lastReplyAt: new Date().toISOString()
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
          throw error;
        }
        
        setMessage(data?.message || 'Unable to generate preview');
        console.log(`✅ [UNIFIED PREVIEW] Generated follow-up message: "${data?.message}"`);
      }
      
    } catch (error) {
      console.error('❌ [UNIFIED PREVIEW] Error generating preview:', error);
      setMessage('Error generating message preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!message) return;
    
    try {
      const { sendMessage } = await import('@/services/messagesService');
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('No user profile found');
      
      await sendMessage(leadId, message, profile, true);
      
      toast({
        title: "Message Sent",
        description: "AI message sent immediately",
      });
      
      onMessageSent();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
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
    if (!msg || msg.includes('Error') || msg.includes('Unable')) {
      return { score: 0, color: 'text-red-600' };
    }
    
    // Simple quality heuristics
    const hasPersonalization = msg.toLowerCase().includes(leadName.toLowerCase());
    const hasVehicle = msg.toLowerCase().includes(vehicleInterest.toLowerCase());
    const goodLength = msg.length > 50 && msg.length < 300;
    const hasCall2Action = /\?|call|visit|appointment|interested|available/i.test(msg);
    const hasFinnIntro = msg.toLowerCase().includes('finn') && conversationHistory.length === 0;
    const hasJasonPilger = msg.toLowerCase().includes('jason pilger chevrolet');
    
    let score = 5;
    if (hasPersonalization) score += 1;
    if (hasVehicle) score += 1;
    if (goodLength) score += 1;
    if (hasCall2Action) score += 2;
    if (hasFinnIntro) score += 1; // Bonus for proper Finn introduction
    if (hasJasonPilger) score += 1; // Bonus for proper dealership name
    
    if (score >= 9) return { score, color: 'text-green-600' };
    if (score >= 7) return { score, color: 'text-yellow-600' };
    return { score, color: 'text-red-600' };
  };

  const quality = getMessageQuality(message);
  const isInitialContact = conversationHistory.length === 0;

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
            disabled={!message || loading || message.includes('Error')}
            className="flex-1"
          >
            <Send className="w-3 h-3 mr-1" />
            Send Now
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => generatePreview()}
            disabled={loading || regenerating}
          >
            <RefreshCcw className="w-3 h-3 mr-1" />
            Regenerate
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIssueSelector(true)}
            disabled={loading || regenerating}
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
