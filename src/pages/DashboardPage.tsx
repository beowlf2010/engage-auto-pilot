
import { useAuth } from "@/components/auth/AuthProvider";
import Dashboard from "@/components/Dashboard";
import { Navigate } from "react-router-dom";

const DashboardPage = () => {
  const { user, profile, loading } = useAuth();

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if no user
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Use profile if available, otherwise create from user data
  const userProfile = profile || {
    id: user.id,
    role: user.user_metadata?.role || 'manager',
    first_name: user.user_metadata?.first_name || 'User',
    last_name: user.user_metadata?.last_name || 'Name',
    email: user.email || ''
  };

  const dashboardUser = {
    id: userProfile.id,
    role: userProfile.role,
    firstName: userProfile.first_name,
    lastName: userProfile.last_name,
    email: userProfile.email
  };

  return <Dashboard user={dashboardUser} />;
};

export default DashboardPage;
