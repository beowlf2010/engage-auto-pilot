
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { unifiedAI } from "@/services/unifiedAIService";
import ConsolidatedSmartInbox from "@/components/inbox/ConsolidatedSmartInbox";

const SmartInboxPage = () => {
  const { profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');

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
      console.log('🤖 Starting unified AI processor for profile:', profile.id);
      
      // Start processing with unified AI service
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
    }
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Smart Inbox</h1>
          <p className="text-slate-600">
            AI-powered conversation management with intelligent insights and automated actions
          </p>
        </div>

        <ConsolidatedSmartInbox 
          onLeadsRefresh={handleLeadsRefresh} 
          preselectedLeadId={leadId}
        />
      </div>
    </div>
  );
};

export default SmartInboxPage;
