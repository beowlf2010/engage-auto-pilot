
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ConversationsList from "./inbox/ConversationsList";
import ChatView from "./inbox/ChatView";
import ConversationMemory from "./ConversationMemory";
import { useRealtimeInbox } from "@/hooks/useRealtimeInbox";
import { useEnhancedAIScheduler } from "@/hooks/useEnhancedAIScheduler";
import { markMessagesAsRead, assignCurrentUserToLead } from "@/services/conversationsService";
import { trackLeadResponse } from "@/services/enhancedAIMessageService";
import { toast } from "@/hooks/use-toast";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [searchParams] = useSearchParams();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const { conversations, messages, loading, fetchMessages, sendMessage, refetch } = useRealtimeInbox();
  const { processing: aiProcessing } = useEnhancedAIScheduler();

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  const selectedConversation = filteredConversations.find(conv => conv.leadId === selectedLead);

  const canReply = (conv: any) => {
    // Managers and admins can reply to any conversation
    if (user.role === "manager" || user.role === "admin") return true;
    
    // Sales users can reply to their own leads or unassigned leads
    return conv.salespersonId === user.id || !conv.salespersonId;
  };

  const handleSendMessage = async (message: string) => {
    if (selectedLead && selectedConversation) {
      // Auto-assign lead if it's unassigned and user can reply
      if (!selectedConversation.salespersonId && canReply(selectedConversation)) {
        console.log(`Auto-assigning lead ${selectedLead} to user ${user.id}`);
        
        const assigned = await assignCurrentUserToLead(selectedLead, user.id);
        if (assigned) {
          toast({
            title: "Lead Assigned",
            description: "This lead has been assigned to you",
          });
          
          // Update the conversation object locally
          selectedConversation.salespersonId = user.id;
        }
      }
      
      await sendMessage(selectedLead, message);
      
      // Refresh conversations to show updated assignment
      setTimeout(() => {
        refetch();
      }, 1000);
    }
  };

  const handleSelectConversation = async (leadId: string) => {
    setSelectedLead(leadId);
    await fetchMessages(leadId);
    
    // Check if this lead has incoming messages to track as responses
    const incomingMessages = messages.filter(msg => msg.direction === 'in');
    if (incomingMessages.length > 0) {
      // Track the most recent incoming message as a response
      const latestIncoming = incomingMessages[incomingMessages.length - 1];
      await trackLeadResponse(leadId, new Date(latestIncoming.sentAt));
    }
    
    // Mark messages as read when viewing the conversation
    await markMessagesAsRead(leadId);
    
    // Refresh conversations to update unread counts
    setTimeout(() => {
      refetch();
    }, 500);
  };

  const handleToggleMemory = () => {
    setShowMemory(!showMemory);
  };

  // Handle pre-selection from URL parameter
  useEffect(() => {
    const leadIdFromUrl = searchParams.get('leadId');
    if (leadIdFromUrl && filteredConversations.length > 0) {
      // Check if the lead exists in conversations
      const conversation = filteredConversations.find(conv => conv.leadId === leadIdFromUrl);
      if (conversation) {
        handleSelectConversation(leadIdFromUrl);
        return;
      }
    }

    // Default selection if no URL parameter or conversation not found
    if (filteredConversations.length > 0 && !selectedLead) {
      const firstConv = filteredConversations[0];
      handleSelectConversation(firstConv.leadId);
    }
  }, [filteredConversations, selectedLead, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-6">
      <div className="relative">
        <ConversationsList
          conversations={filteredConversations}
          selectedLead={selectedLead}
          onSelectConversation={handleSelectConversation}
          canReply={canReply}
        />
        
        {aiProcessing && (
          <div className="absolute top-2 right-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Finn is working...</span>
          </div>
        )}
      </div>

      <ChatView
        selectedConversation={selectedConversation}
        messages={messages}
        canReply={canReply}
        onSendMessage={handleSendMessage}
        onToggleMemory={handleToggleMemory}
      />

      {showMemory && selectedLead && (
        <ConversationMemory leadId={parseInt(selectedLead)} />
      )}
    </div>
  );
};

export default SmartInbox;
