
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import FinancialUpload from "@/components/financial/FinancialUpload";
import FinancialMetrics from "@/components/financial/FinancialMetrics";

const FinancialDashboard = () => {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const user = {
    id: profile.id,
    role: profile.role
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Financial Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Track daily sales performance and profit metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/inventory-dashboard">
              <Button variant="outline" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Inventory Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial Metrics */}
        <FinancialMetrics />

        {/* Upload Section */}
        <FinancialUpload user={user} />
      </div>
    </div>
  );
};

export default FinancialDashboard;
