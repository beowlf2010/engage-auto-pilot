
import { useAuth } from "@/components/auth/AuthProvider";
import StreamlinedNavigation from "@/components/StreamlinedNavigation";
import EnhancedDashboard from "@/components/enhanced/EnhancedDashboard";
import { Navigate } from "react-router-dom";

const DashboardPage = () => {
  const { profile, loading } = useAuth();

  console.log('DashboardPage - profile:', profile);
  console.log('DashboardPage - loading:', loading);

  if (loading) {
    console.log('DashboardPage - showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    console.log('DashboardPage - no profile, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('DashboardPage - rendering dashboard for user:', profile);

  const user = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <StreamlinedNavigation />
      <main className="flex-1">
        <EnhancedDashboard user={user} />
      </main>
    </div>
  );
};

export default DashboardPage;
