
import { useAuth } from "@/components/auth/AuthProvider";
import SmartInboxWithAILearning from "@/components/inbox/SmartInboxWithAILearning";
import { Navigate } from "react-router-dom";
import { useEffect } from "react";

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading inbox...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  const user = {
    id: profile.id,
    role: profile.role
  };

  return <SmartInboxWithAILearning user={user} />;
};

export default SmartInboxPage;
