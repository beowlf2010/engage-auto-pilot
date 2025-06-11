
import { useAuth } from "@/components/auth/AuthProvider";
import FinancialUpload from "@/components/financial/FinancialUpload";
import FinancialMetrics from "@/components/financial/FinancialMetrics";
import DealManagement from "@/components/financial/DealManagement";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FinancialDashboard = () => {
  const { profile, loading } = useAuth();
  const [packAdjustment, setPackAdjustment] = useState(0);
  const [packAdjustmentEnabled, setPackAdjustmentEnabled] = useState(false);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Financial Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Track daily sales performance and profit metrics
          </p>
        </div>
      </div>

      {/* Pack Adjustment Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={packAdjustmentEnabled}
              onChange={(e) => setPackAdjustmentEnabled(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-slate-700">Used Car Pack Adjustment</span>
          </label>
          {packAdjustmentEnabled && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">$</span>
              <input
                type="number"
                value={packAdjustment}
                onChange={(e) => setPackAdjustment(Number(e.target.value))}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
              <span className="text-xs text-slate-500">per used vehicle</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deal Management</TabsTrigger>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FinancialMetrics 
            packAdjustment={packAdjustmentEnabled ? packAdjustment : 0} 
          />
        </TabsContent>

        <TabsContent value="deals" className="space-y-6">
          <DealManagement 
            user={user} 
            packAdjustment={packAdjustmentEnabled ? packAdjustment : 0}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <FinancialUpload user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
