
import { useAuth } from "@/components/auth/AuthProvider";
import StreamlinedNavigation from "@/components/StreamlinedNavigation";
import LeadsList from "@/components/LeadsList";
import { Navigate } from "react-router-dom";

const StreamlinedLeadsPage = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <StreamlinedNavigation />
      <main className="flex-1 p-6">
        <LeadsList />
      </main>
    </div>
  );
};

export default StreamlinedLeadsPage;
