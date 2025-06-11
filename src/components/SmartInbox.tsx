
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import ConversationsList from "./inbox/ConversationsList";
import ChatView from "./inbox/ChatView";
import ConversationMemory from "./ConversationMemory";
import { useRealtimeInbox } from "@/hooks/useRealtimeInbox";
import { useAIScheduler } from "@/hooks/useAIScheduler";
import { markMessagesAsRead, assignCurrentUserToLead } from "@/services/conversationsService";
import { toast } from "@/hooks/use-toast";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const { conversations, messages, loading, fetchMessages, sendMessage, refetch } = useRealtimeInbox();
  const { processing: aiProcessing } = useAIScheduler();

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

  useEffect(() => {
    if (filteredConversations.length > 0 && !selectedLead) {
      const firstConv = filteredConversations[0];
      handleSelectConversation(firstConv.leadId);
    }
  }, [filteredConversations, selectedLead]);

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
