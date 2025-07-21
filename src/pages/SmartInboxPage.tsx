
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigate, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileSmartInbox from "@/components/inbox/MobileSmartInbox";
import SmartInbox from "@/components/inbox/SmartInbox";
import ErrorBoundary from "@/components/inbox/ErrorBoundary";
import { useEffect } from "react";

const SmartInboxPage = () => {
  const { profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading Smart Inbox...</p>
          <p className="text-sm text-gray-500 mt-1">Stable realtime connection</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  const handleBack = () => {
    window.history.back();
  };

  return (
    <ErrorBoundary>
      <div className="h-screen w-full bg-background flex flex-col">
        {isMobile ? (
          <MobileSmartInbox 
            onBack={handleBack} 
            leadId={leadId || undefined}
          />
        ) : (
          <SmartInbox 
            onBack={handleBack}
            leadId={leadId || undefined}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SmartInboxPage;
