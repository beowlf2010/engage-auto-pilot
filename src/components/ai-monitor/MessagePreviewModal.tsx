
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LeadContextCard from './LeadContextCard';
import ConversationHistory from './ConversationHistory';
import MessageEditor from './MessageEditor';
import { getMessageQualityScore, formatTime } from './messageUtils';
import EnhancedMessagePreview from './EnhancedMessagePreview';

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
  { value: 'personalization', label: 'Personalization Issue', description: 'Message lacks personalization or context' },
  { value: 'call_to_action', label: 'Call-to-Action Issue', description: 'Weak or missing call-to-action' },
  { value: 'other', label: 'Other Issue', description: 'Other concerns not listed above' }
];

const MessagePreviewModal = ({ open, onClose, leadId, onApprove, onReject }: MessagePreviewModalProps) => {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [leadContext, setLeadContext] = useState<LeadContext | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [regenerationHistory, setRegenerationHistory] = useState<Array<{message: string, timestamp: Date, issueContext?: string}>>([]);

  useEffect(() => {
    if (open && leadId) {
      loadLeadContext();
      generatePreviewMessage();
      setRegenerationHistory([]);
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

  const generatePreviewMessage = async (issueContext?: string) => {
    setGenerating(true);
    try {
      console.log(`🤖 [MODAL PREVIEW] Generating preview via unified function for ${leadContext?.firstName || 'lead'}`);
      
      const issueType = issueContext ? issueTypes.find(type => type.value === issueContext) : null;
      const contextMessage = issueType ? `Previous message had ${issueType.label}: ${issueType.description}. Please address this concern.` : undefined;

      // Use the unified intelligent-conversation-ai function
      const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId,
          leadName: leadContext ? `${leadContext.firstName} ${leadContext.lastName}` : 'Lead',
          vehicleInterest: leadContext?.vehicleInterest || '',
          lastCustomerMessage: leadContext?.lastResponse || '',
          conversationHistory: leadContext?.conversationHistory?.map(msg => `${msg.direction === 'in' ? 'Customer' : 'You'}: ${msg.body}`).join('\n') || '',
          leadInfo: {
            phone: '',
            status: 'new',
            lastReplyAt: new Date().toISOString()
          },
          conversationLength: leadContext?.conversationHistory?.length || 0,
          inventoryStatus: {
            hasInventory: true,
            totalVehicles: 20
          },
          isInitialContact: !leadContext?.conversationHistory?.length || leadContext.conversationHistory.length === 0,
          salespersonName: 'Finn', // Always force Finn
          dealershipName: 'Jason Pilger Chevrolet', // Always use correct dealership
          context: { 
            preview: true,
            issueContext: contextMessage,
            vehicleInterest: leadContext?.vehicleInterest,
            regeneration: !!issueContext
          }
        }
      });

      if (error) {
        console.error('❌ [MODAL PREVIEW] Unified function error:', error);
        throw error;
      }

      const message = data?.message || 'Unable to generate preview message';
      setGeneratedMessage(message);
      setEditedMessage(message);

      console.log(`✅ [MODAL PREVIEW] Generated via unified function: ${message}`);

      // Add to regeneration history
      setRegenerationHistory(prev => [...prev, {
        message,
        timestamp: new Date(),
        issueContext: issueType?.label
      }]);

    } catch (error) {
      console.error('❌ [MODAL PREVIEW] Error generating preview message:', error);
      const errorMessage = 'Unable to generate preview message';
      setGeneratedMessage(errorMessage);
      setEditedMessage(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateWithIssue = async () => {
    if (!selectedIssue) return;
    
    await generatePreviewMessage(selectedIssue);
    setSelectedIssue('');
  };

  const handleApprove = () => {
    onApprove(editedMessage || generatedMessage);
    onClose();
  };

  const qualityScore = getMessageQualityScore(editedMessage || generatedMessage, leadContext);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enhanced AI Message Preview
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Context */}
          <div className="space-y-4">
            <LeadContextCard leadContext={leadContext} formatTime={formatTime} />
            <ConversationHistory 
              conversationHistory={leadContext?.conversationHistory || []} 
              formatTime={formatTime} 
            />
          </div>

          {/* Message Preview & Editing */}
          <div className="lg:col-span-2 space-y-4">
            {/* Issue Flagging Section */}
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-sm">Issue Flagging & Regeneration</span>
              </div>
              
              <div className="flex gap-2">
                <Select value={selectedIssue} onValueChange={setSelectedIssue}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select issue type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((issue) => (
                      <SelectItem key={issue.value} value={issue.value}>
                        <div className="text-left">
                          <div className="font-medium">{issue.label}</div>
                          <div className="text-xs text-muted-foreground">{issue.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleRegenerateWithIssue}
                  disabled={!selectedIssue || generating}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCcw className="w-4 h-4 mr-1" />
                  {generating ? 'Regenerating...' : 'Fix Issue'}
                </Button>
              </div>

              {regenerationHistory.length > 1 && (
                <div className="text-xs text-muted-foreground">
                  Regenerated {regenerationHistory.length - 1} time(s)
                  {regenerationHistory.slice(-1)[0]?.issueContext && 
                    ` (last: ${regenerationHistory.slice(-1)[0].issueContext})`
                  }
                </div>
              )}
            </div>

            <MessageEditor
              generatedMessage={generatedMessage}
              editedMessage={editedMessage}
              setEditedMessage={setEditedMessage}
              generating={generating}
              qualityScore={qualityScore}
            />

            {/* Enhanced Message Preview with Learning */}
            {generatedMessage && leadContext && (
              <EnhancedMessagePreview
                leadId={leadId}
                leadName={`${leadContext.firstName} ${leadContext.lastName}`}
                messageContent={editedMessage || generatedMessage}
                onMessageSent={() => {
                  handleApprove();
                }}
                onFeedbackSubmitted={() => {
                  // Optionally refresh or show feedback confirmation
                }}
              />
            )}

            {/* Regeneration History */}
            {regenerationHistory.length > 1 && (
              <div className="bg-muted p-3 rounded space-y-2">
                <div className="text-sm font-medium">Previous Versions:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {regenerationHistory.slice(0, -1).reverse().map((item, index) => (
                    <div key={index} className="text-xs p-2 bg-background rounded">
                      <div className="font-medium text-muted-foreground">
                        {formatTime(item.timestamp.toISOString())}
                        {item.issueContext && ` - Fixed: ${item.issueContext}`}
                      </div>
                      <div className="truncate">{item.message.substring(0, 100)}...</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onReject}>
            Skip This Lead
          </Button>
          <Button 
            variant="outline" 
            onClick={() => generatePreviewMessage()} 
            disabled={generating}
          >
            <RefreshCcw className="w-4 h-4 mr-1" />
            Simple Regenerate
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
