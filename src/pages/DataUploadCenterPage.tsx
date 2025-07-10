import { useAuth } from "@/components/auth/AuthProvider";
import DataUploadCenter from "@/components/DataUploadCenter";
import { Navigate } from "react-router-dom";

const DataUploadCenterPage = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading data upload center...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has permission to access upload features
  if (!['admin', 'manager'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const user = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone
  };

  return <DataUploadCenter user={user} />;
};

export default DataUploadCenterPage;