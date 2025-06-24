
import { useAuth } from "@/components/auth/AuthProvider";
import ConsolidatedSmartInbox from "@/components/inbox/ConsolidatedSmartInbox";
import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { backgroundAIProcessor } from "@/services/backgroundAIProcessor";

const SmartInboxPage = () => {
  const { profile, loading } = useAuth();

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

  // Start background AI processor when profile is available (reduced frequency)
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

  return <ConsolidatedSmartInbox onLeadsRefresh={() => {}} />;
};

export default SmartInboxPage;
