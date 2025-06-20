
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import StreamlinedNavigation from "@/components/StreamlinedNavigation";
import PredictiveAnalyticsOverview from "@/components/predictive/PredictiveAnalyticsOverview";
import { Navigate } from "react-router-dom";

const PredictiveAnalyticsPage = () => {
  const { profile, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has permission to access predictive analytics
  if (!['admin', 'manager'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex">
      <div className="flex-shrink-0">
        <StreamlinedNavigation 
          isCollapsed={isCollapsed}
          onExpand={() => setIsCollapsed(false)}
          onCollapse={() => setIsCollapsed(true)}
        />
      </div>
      <main className="flex-1 p-6">
        <PredictiveAnalyticsOverview />
      </main>
    </div>
  );
};

export default PredictiveAnalyticsPage;
