
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessages from "./ChatMessages";
import MessageInput from "./MessageInput";
import IntelligentAIPanel from "@/components/inbox/IntelligentAIPanel";
import { unifiedAIResponseEngine, MessageContext } from "@/services/unifiedAIResponseEngine";
import { toast } from "@/hooks/use-toast";
import type { LeadDetailData } from "@/services/leadDetailService";

interface ChatContainerProps {
  lead: LeadDetailData;
  primaryPhone: string;
  messages: any[];
  messagesLoading: boolean;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  unreadCount?: number;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  lead,
  primaryPhone,
  messages,
  messagesLoading,
  newMessage,
  setNewMessage,
  onSendMessage,
  isSending,
  unreadCount = 0
}) => {
  const [showAIPanel, setShowAIPanel] = React.useState(false);
  const [aiGenerating, setAiGenerating] = React.useState(false);

  const handleSendMessage = () => {
    console.log('🔍 [CHAT CONTAINER] handleSendMessage called');
    console.log('🔍 [CHAT CONTAINER] Message:', newMessage);
    console.log('🔍 [CHAT CONTAINER] isSending:', isSending);
    console.log('🔍 [CHAT CONTAINER] onSendMessage type:', typeof onSendMessage);
    
    try {
      onSendMessage();
    } catch (error) {
      console.error('❌ [CHAT CONTAINER] Error in handleSendMessage:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    console.log('🔍 [CHAT CONTAINER] Key pressed:', e.key);
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check if AI should generate a response
  const shouldShowAIButton = React.useMemo(() => {
    const lastMessage = messages.filter(msg => msg.direction === 'in').slice(-1)[0];
    return lastMessage && !messages.some(msg => 
      msg.direction === 'out' && 
      new Date(msg.sent_at) > new Date(lastMessage.sent_at)
    );
  }, [messages]);

  const handleAIResponse = async () => {
    setAiGenerating(true);
    try {
      console.log('🤖 Generating enhanced AI response for lead:', lead.id);
      
      const lastCustomerMessage = messages.filter(msg => msg.direction === 'in').slice(-1)[0];
      
      if (!lastCustomerMessage) {
        toast({
          title: "No Customer Message",
          description: "No recent customer message to respond to",
          variant: "default"
        });
        return;
      }

      const messageContext: MessageContext = {
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        latestMessage: lastCustomerMessage.body,
        conversationHistory: messages.map(m => m.body),
        vehicleInterest: lead.vehicleInterest || ''
      };

      const aiResponse = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (aiResponse?.message) {
        setNewMessage(aiResponse.message);
        setShowAIPanel(false);
        toast({
          title: "AI Response Generated",
          description: "AI has generated a response. Review and send when ready.",
        });
      } else {
        toast({
          title: "No Response Generated",
          description: "AI could not generate a response at this time",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI response",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSendAIMessage = async (message: string) => {
    console.log('📤 Auto-sending AI message:', message);
    setNewMessage(message);
    
    // Use requestAnimationFrame to ensure state is updated before calling onSendMessage
    requestAnimationFrame(() => {
      handleSendMessage();
    });
  };

  // Create conversation context for AI panel
  const conversationContext = React.useMemo(() => ({
    leadId: lead.id,
    leadName: `${lead.firstName} ${lead.lastName}`,
    vehicleInterest: lead.vehicleInterest || '',
    leadPhone: primaryPhone,
    status: 'active',
    lastReplyAt: messages.length > 0 ? messages[messages.length - 1].sent_at : null
  }), [lead, primaryPhone, messages]);

  return (
    <div className="flex-1 flex flex-col space-y-2">
      {/* AI Panel */}
      <IntelligentAIPanel
        conversation={conversationContext}
        messages={messages}
        onSendMessage={handleSendAIMessage}
        canReply={true}
        isCollapsed={!showAIPanel}
        onToggleCollapse={() => setShowAIPanel(!showAIPanel)}
      />

      <Card className="flex-1 flex flex-col min-h-0">
        {/* Chat Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h1>
              <p className="text-sm text-gray-500">{primaryPhone}</p>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
              {shouldShowAIButton && (
                <Button
                  onClick={handleAIResponse}
                  disabled={aiGenerating}
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  {aiGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Bot className="w-4 h-4 mr-2" />
                  )}
                  {aiGenerating ? 'Generating...' : 'AI Suggest'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading messages...</span>
            </div>
          ) : (
            <ChatMessages messages={messages} />
          )}
        </div>

        {/* Message Input */}
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
          isSending={isSending}
        />
      </Card>
    </div>
  );
};

export default ChatContainer;
