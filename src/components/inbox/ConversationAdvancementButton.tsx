import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Clock, TrendingUp, Zap } from 'lucide-react';
import { conversationAdvancementService } from '@/services/conversationAdvancementService';
import { useToast } from '@/hooks/use-toast';

interface ConversationAdvancementButtonProps {
  leadId: string;
  lastMessageDirection: 'in' | 'out';
  timeSinceLastMessage: number; // hours
  className?: string;
}

export const ConversationAdvancementButton: React.FC<ConversationAdvancementButtonProps> = ({
  leadId,
  lastMessageDirection,
  timeSinceLastMessage,
  className = ""
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const { toast } = useToast();

  // Determine if conversation needs advancement
  const needsAdvancement = lastMessageDirection === 'in' && timeSinceLastMessage > 1;
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <Zap className="w-3 h-3" />;
      case 'medium': return <TrendingUp className="w-3 h-3" />;
      case 'low': return <Clock className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  const analyzeConversation = async () => {
    setIsAnalyzing(true);
    try {
      const result = await conversationAdvancementService.advanceConversation(leadId);
      
      if (result.success && result.strategy) {
        setStrategy(result.strategy);
        toast({
          title: "Conversation Analyzed",
          description: `Found ${result.strategy.urgencyLevel} urgency advancement opportunity`,
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: result.message || "No advancement needed at this time"
        });
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze conversation",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendAdvancementMessage = async () => {
    if (!strategy) return;
    
    setIsSending(true);
    try {
      const result = await conversationAdvancementService.sendAdvancementMessage(leadId, strategy);
      
      if (result.success) {
        toast({
          title: "Message Sent",
          description: "Advancement message sent successfully",
        });
        setStrategy(null); // Reset after sending
        
        // Trigger message refresh
        window.dispatchEvent(new CustomEvent('lead-messages-update', { 
          detail: { leadId } 
        }));
      } else {
        toast({
          title: "Send Failed",
          description: "Could not send advancement message",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Send Error",
        description: "Error sending message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!needsAdvancement && !strategy) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Analysis Button */}
      {!strategy && (
        <Button
          onClick={analyzeConversation}
          disabled={isAnalyzing}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2" />
              Analyzing Conversation...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Advance Conversation
            </>
          )}
        </Button>
      )}

      {/* Strategy Preview & Send */}
      {strategy && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge 
                variant="secondary" 
                className={`${getUrgencyColor(strategy.urgencyLevel)} text-white`}
              >
                {getUrgencyIcon(strategy.urgencyLevel)}
                <span className="ml-1 capitalize">{strategy.urgencyLevel} Urgency</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {timeSinceLastMessage}h ago
              </span>
            </div>
            
            <div className="text-sm bg-muted/50 rounded p-3">
              "{strategy.messageContent}"
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={sendAdvancementMessage}
                disabled={isSending}
                size="sm"
                className="flex-1"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-background mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setStrategy(null)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
            
            {strategy.followUpSequence && (
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Planned Follow-ups:</div>
                <ul className="space-y-1">
                  {strategy.followUpSequence.slice(0, 2).map((followUp, index) => (
                    <li key={index} className="truncate">• {followUp}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};