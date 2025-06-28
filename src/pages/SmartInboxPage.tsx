
import { useAuth } from "@/components/auth/AuthProvider";
import InboxLayout from "@/components/inbox/InboxLayout";
import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { backgroundAIProcessor } from "@/services/backgroundAIProcessor";
import { useConversationsList } from "@/hooks/conversation/useConversationsList";
import { useMessagesOperations } from "@/hooks/conversation/useMessagesOperations";
import { useMarkAsRead } from "@/hooks/useMarkAsRead";

const SmartInboxPage = () => {
  const { profile, loading } = useAuth();

  // Use existing conversation hooks
  const { 
    conversations, 
    loading: conversationsLoading, 
    selectedLead, 
    setSelectedLead 
  } = useConversationsList();

  const { 
    messages, 
    sendMessage, 
    sendingMessage 
  } = useMessagesOperations(selectedLead);

  const { markAsRead, markingAsRead } = useMarkAsRead();

  // Request notification permission when the page loads
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }
    };

    requestNotificationPermission();
  }, []);

  // Start background AI processor when profile is available
  useEffect(() => {
    if (profile?.id) {
      console.log('🤖 Starting background AI processor for profile:', profile.id);
      backgroundAIProcessor.start(profile.id);

      return () => {
        console.log('🤖 Stopping background AI processor');
        backgroundAIProcessor.stop();
      };
    }
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading Smart Inbox...</p>
          <p className="text-sm text-gray-500 mt-1">Newest conversations first</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  const handleSelectConversation = async (leadId: string) => {
    setSelectedLead(leadId);
  };

  const handleSendMessage = async (message: string, isTemplate?: boolean) => {
    if (selectedLead) {
      await sendMessage(message, isTemplate);
    }
  };

  const canReply = (conversation: any) => {
    return conversation.lastMessageDirection === 'in' || conversation.unreadCount > 0;
  };

  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Smart Inbox</h1>
          <p className="text-slate-600">
            Manage your conversations with clean tabs and focused messaging
          </p>
        </div>

        <InboxLayout
          conversations={conversations}
          messages={messages}
          selectedLead={selectedLead}
          selectedConversation={selectedConversation}
          showMemory={false}
          showTemplates={false}
          sendingMessage={sendingMessage}
          loading={conversationsLoading}
          user={{
            role: profile.role,
            id: profile.id
          }}
          onSelectConversation={handleSelectConversation}
          onSendMessage={handleSendMessage}
          onToggleTemplates={() => {}}
          canReply={canReply}
          markAsRead={markAsRead}
          markingAsRead={markingAsRead}
        />
      </div>
    </div>
  );
};

export default SmartInboxPage;
