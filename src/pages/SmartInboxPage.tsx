
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { unifiedAI } from "@/services/unifiedAIService";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileSmartInbox from "@/components/inbox/MobileSmartInbox";
import ErrorBoundary from "@/components/inbox/ErrorBoundary";

const SmartInboxPage = () => {
  const { profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const isMobile = useIsMobile();
  

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

  return (
    <ErrorBoundary>
      <div className="h-screen w-full bg-background flex flex-col">
        <MobileSmartInbox 
          onLeadsRefresh={handleLeadsRefresh} 
          preselectedLeadId={leadId}
        />
      </div>
    </ErrorBoundary>
  );
};

export default SmartInboxPage;
