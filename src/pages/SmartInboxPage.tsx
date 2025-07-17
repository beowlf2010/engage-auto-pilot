
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { unifiedAI } from "@/services/unifiedAIService";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileSmartInbox from "@/components/inbox/MobileSmartInbox";
import AIAssistantModal from "@/components/inbox/AIAssistantModal";
import { SMSDebugPanel } from "@/components/debug/SMSDebugPanel";

const SmartInboxPage = () => {
  const { profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const isMobile = useIsMobile();
  
  // AI Assistant Modal state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiModalData, setAIModalData] = useState({
    selectedConversation: null,
    messages: [],
    canReply: false,
    onSendMessage: async () => {}
  });

  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }
    };

    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      console.log('🚫 AI automation DISABLED - preventing SMS spam to suppressed numbers');
      
      // EMERGENCY SHUTDOWN: AI automation disabled to prevent SMS spam
      // DO NOT RE-ENABLE without implementing proper compliance checks
      /* DISABLED FOR COMPLIANCE REASONS
      const processInterval = setInterval(async () => {
        try {
          await unifiedAI.processAllPendingResponses(profile);
          unifiedAI.cleanupProcessedMessages();
        } catch (error) {
          console.error('❌ Unified AI processing error:', error);
        }
      }, 30000); // Process every 30 seconds

      return () => {
        console.log('🤖 Stopping unified AI processor');
        clearInterval(processInterval);
      };
      */
    }
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading Smart Inbox...</p>
          <p className="text-sm text-gray-500 mt-1">AI-powered conversation management</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  const handleLeadsRefresh = () => {
    window.location.reload();
  };

  const handleOpenAIModal = (data?: any) => {
    if (data) {
      setAIModalData(data);
    }
    setIsAIModalOpen(true);
  };

  const handleCloseAIModal = () => {
    setIsAIModalOpen(false);
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Temporary debug panel - only show if user is admin */}
      {profile?.role === 'admin' && (
        <div className="absolute top-4 right-4 z-50 w-96">
          <SMSDebugPanel />
        </div>
      )}
      <MobileSmartInbox 
        onLeadsRefresh={handleLeadsRefresh} 
        preselectedLeadId={leadId}
        onOpenAIModal={handleOpenAIModal}
      />
      
      {/* Floating AI Assistant Button */}
      <Button
        onClick={() => handleOpenAIModal()}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 z-50"
        size="icon"
      >
        <div className="relative">
          <Bot className="h-6 w-6" />
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400" />
        </div>
      </Button>
      
      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={handleCloseAIModal}
        selectedConversation={aiModalData.selectedConversation}
        messages={aiModalData.messages}
        onSendMessage={aiModalData.onSendMessage}
        canReply={aiModalData.canReply}
      />
    </div>
  );
};

export default SmartInboxPage;
