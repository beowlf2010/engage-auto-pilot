
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import ConversationsList from "./inbox/ConversationsList";
import ChatView from "./inbox/ChatView";
import ConversationMemory from "./ConversationMemory";
import { useConversations } from "@/hooks/useConversations";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const { conversations, messages, loading, fetchMessages, sendMessage } = useConversations();

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
      await sendMessage(selectedLead, message);
    }
  };

  const handleSelectConversation = (leadId: string) => {
    setSelectedLead(leadId);
    fetchMessages(leadId);
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
      <ConversationsList
        conversations={filteredConversations}
        selectedLead={selectedLead}
        onSelectConversation={handleSelectConversation}
        canReply={canReply}
      />

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
