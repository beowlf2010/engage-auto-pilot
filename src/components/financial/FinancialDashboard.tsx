
import FinancialUpload from "./FinancialUpload";
import DealManagement from "./DealManagement";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FinancialDashboardProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

const FinancialDashboard = ({ user }: FinancialDashboardProps) => {
  // Load pack adjustment from localStorage with default of 1500
  const [packAdjustment, setPackAdjustment] = useState(() => {
    const saved = localStorage.getItem('packAdjustment');
    return saved ? Number(saved) : 1500;
  });
  
  const [packAdjustmentEnabled, setPackAdjustmentEnabled] = useState(() => {
    const saved = localStorage.getItem('packAdjustmentEnabled');
    return saved === 'true';
  });

  // Save pack adjustment to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('packAdjustment', packAdjustment.toString());
  }, [packAdjustment]);

  useEffect(() => {
    localStorage.setItem('packAdjustmentEnabled', packAdjustmentEnabled.toString());
  }, [packAdjustmentEnabled]);

  const effectivePackAdjustment = packAdjustmentEnabled ? packAdjustment : 0;

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

      {/* Main Content Tabs */}
      <Tabs defaultValue="deals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deals">Deal Management</TabsTrigger>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
        </TabsList>

        <TabsContent value="deals" className="space-y-6">
          <DealManagement 
            user={{ id: user.id, role: user.role }} 
            packAdjustment={effectivePackAdjustment}
            packAdjustmentEnabled={packAdjustmentEnabled}
            setPackAdjustmentEnabled={setPackAdjustmentEnabled}
            localPackAdjustment={packAdjustment}
            setLocalPackAdjustment={setPackAdjustment}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <FinancialUpload user={{ id: user.id, role: user.role }} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
