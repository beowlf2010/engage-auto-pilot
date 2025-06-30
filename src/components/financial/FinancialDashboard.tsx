
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Upload, Settings, Database } from "lucide-react";
import FlexibleFinancialUpload from "./FlexibleFinancialUpload";
import DealManagement from "./DealManagement";

interface FinancialDashboardProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

const FinancialDashboard = ({ user }: FinancialDashboardProps) => {
  const [activeTab, setActiveTab] = useState("upload");
  const [packAdjustmentEnabled, setPackAdjustmentEnabled] = useState(false);
  const [localPackAdjustment, setLocalPackAdjustment] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Financial Dashboard</h1>
          <p className="text-slate-600">
            Upload and manage your financial data with flexible column mapping
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload Data</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Manage Deals</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <FlexibleFinancialUpload user={user} />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <DealManagement 
              user={user}
              packAdjustment={localPackAdjustment}
              packAdjustmentEnabled={packAdjustmentEnabled}
              setPackAdjustmentEnabled={setPackAdjustmentEnabled}
              localPackAdjustment={localPackAdjustment}
              setLocalPackAdjustment={setLocalPackAdjustment}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Financial Analytics</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive financial reporting and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">Analytics Coming Soon</h3>
                  <p className="text-slate-600">
                    Advanced financial analytics and reporting features will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialDashboard;
