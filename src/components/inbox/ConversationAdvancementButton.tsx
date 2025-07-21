
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, Clock } from 'lucide-react';
import { conversationAdvancementService } from '@/services/conversationAdvancementService';
import { toast } from '@/hooks/use-toast';

interface ConversationAdvancementButtonProps {
  leadId: string;
  lastMessageDirection: 'in' | 'out';
  timeSinceLastMessage: number;
}

export const ConversationAdvancementButton: React.FC<ConversationAdvancementButtonProps> = ({
  leadId,
  lastMessageDirection,
  timeSinceLastMessage
}) => {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const shouldShowButton = () => {
    // Show button if last message was incoming and it's been more than 2 hours
    return lastMessageDirection === 'in' && timeSinceLastMessage >= 2;
  };

  const getButtonText = () => {
    if (timeSinceLastMessage < 6) {
      return 'Quick Follow-up';
    } else if (timeSinceLastMessage < 24) {
      return 'Add Value';
    } else if (timeSinceLastMessage < 72) {
      return 'Create Urgency';
    } else {
      return 'Re-engage Lead';
    }
  };

  const getButtonIcon = () => {
    if (timeSinceLastMessage < 24) {
      return <MessageSquare className="w-4 h-4 mr-2" />;
    } else {
      return <Zap className="w-4 h-4 mr-2" />;
    }
  };

  const handleAdvanceConversation = async () => {
    setIsAdvancing(true);
    try {
      console.log(`🚀 [ADVANCEMENT BUTTON] Advancing conversation for lead: ${leadId}`);
      
      const result = await conversationAdvancementService.advanceConversation(leadId);
      
      if (result.success && result.strategy) {
        // Send the advancement message
        const sent = await conversationAdvancementService.sendAdvancementMessage(leadId, result.strategy);
        
        if (sent) {
          toast({
            title: "Message Sent",
            description: `AI advancement message sent successfully.`,
          });
        } else {
          toast({
            title: "Send Failed",
            description: "Failed to send advancement message. Please try again.",
            variant: "destructive",
          });
        }
      } else if (result.aiDisabled) {
        toast({
          title: "AI Disabled",
          description: "AI conversation advancement is currently disabled.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Advancement Failed",
          description: result.error || "Failed to advance conversation. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ [ADVANCEMENT BUTTON] Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while advancing the conversation.",
        variant: "destructive",
      });
    } finally {
      setIsAdvancing(false);
    }
  };

  if (!shouldShowButton()) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center space-x-2 text-sm text-blue-700">
        <Clock className="w-4 h-4" />
        <span>
          Customer replied {timeSinceLastMessage}h ago
        </span>
      </div>
      
      <Button
        onClick={handleAdvanceConversation}
        disabled={isAdvancing}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {getButtonIcon()}
        {isAdvancing ? 'Sending...' : getButtonText()}
      </Button>
    </div>
  );
};
