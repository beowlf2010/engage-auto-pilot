import { useAuth } from "@/components/auth/AuthProvider";
import DataUploadCenter from "@/components/DataUploadCenter";
import SequentialDataUploadModal from "@/components/SequentialDataUploadModal";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

const DataUploadCenterPage = () => {
  const { profile, loading } = useAuth();
  const [showSequentialModal, setShowSequentialModal] = useState(false);

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
    lastName: profile.last_name
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          {/* Sequential Upload Banner */}
          <div className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-2">Complete Data Refresh</h2>
                <p className="text-muted-foreground">
                  Upload all your data files in the correct order: Used Cars → New Cars → Sales Data → Recent Leads
                </p>
              </div>
              <Button 
                onClick={() => setShowSequentialModal(true)}
                className="bg-primary hover:bg-primary/90"
                size="lg"
              >
                Start Sequential Upload
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <DataUploadCenter user={user} />
        </div>
      </div>

      <SequentialDataUploadModal
        isOpen={showSequentialModal}
        onClose={() => setShowSequentialModal(false)}
        userId={user.id}
        onSuccess={() => setShowSequentialModal(false)}
      />
    </>
  );
};

export default DataUploadCenterPage;