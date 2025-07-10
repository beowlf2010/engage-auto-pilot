import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Users, Package, DollarSign, TrendingUp, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UploadLeads from "./UploadLeads";
import InventoryUpload from "./InventoryUpload";
import FlexibleFinancialUpload from "./financial/FlexibleFinancialUpload";

interface DataUploadCenterProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

interface UploadStatus {
  leads: { count: number; lastUpload?: string };
  inventory: { count: number; lastUpload?: string };
  financial: { count: number; lastUpload?: string };
}

const DataUploadCenter = ({ user }: DataUploadCenterProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Mock data - in real implementation, fetch from database
  const uploadStatus: UploadStatus = {
    leads: { count: 1250, lastUpload: "2 hours ago" },
    inventory: { count: 450, lastUpload: "1 day ago" },
    financial: { count: 120, lastUpload: "3 hours ago" }
  };

  const getRecommendedOrder = () => {
    // Intelligent upload order recommendations based on data relationships
    const recommendations = [];
    
    if (uploadStatus.inventory.count === 0) {
      recommendations.push({
        type: "inventory",
        priority: "high",
        reason: "Upload inventory first to enable vehicle matching in financial and lead data"
      });
    }
    
    if (uploadStatus.inventory.count > 0 && uploadStatus.financial.count === 0) {
      recommendations.push({
        type: "financial",
        priority: "medium",
        reason: "Upload financial data to connect deals with existing inventory"
      });
    }
    
    if (uploadStatus.inventory.count > 0) {
      recommendations.push({
        type: "leads",
        priority: "low",
        reason: "Upload leads last for optimal vehicle matching and deal correlation"
      });
    }
    
    return recommendations;
  };

  const recommendations = getRecommendedOrder();

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Data</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStatus.leads.count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last upload: {uploadStatus.leads.lastUpload}
            </p>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-600/5" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Data</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStatus.inventory.count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last upload: {uploadStatus.inventory.lastUpload}
            </p>
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-green-600/5" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Data</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStatus.financial.count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last upload: {uploadStatus.financial.lastUpload}
            </p>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-purple-600/5" />
          </CardContent>
        </Card>
      </div>

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Smart Upload Recommendations</span>
            </CardTitle>
            <CardDescription>
              Optimize your data flow with our intelligent upload sequencing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={rec.type} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'outline'}>
                      {index + 1}
                    </Badge>
                    {rec.type === 'inventory' && <Package className="h-4 w-4" />}
                    {rec.type === 'financial' && <DollarSign className="h-4 w-4" />}
                    {rec.type === 'leads' && <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">{rec.type} Upload</div>
                    <div className="text-sm text-muted-foreground">{rec.reason}</div>
                  </div>
                  <Badge variant="outline">{rec.priority} priority</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Data Integration Health</span>
          </CardTitle>
          <CardDescription>
            Overview of how well your data systems are connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Inventory ↔ Financial</div>
                <div className="text-sm text-muted-foreground">85% of deals linked to inventory</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium">Leads ↔ Inventory</div>
                <div className="text-sm text-muted-foreground">62% of leads matched to vehicles</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Data Upload Center</h1>
          <p className="text-slate-600">
            Unified platform for uploading leads, inventory, and financial data with intelligent processing
          </p>
        </div>

        {/* Enhanced Processing Notice */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Upload className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Enhanced Processing:</strong> This unified system automatically detects relationships between your data, 
            validates cross-system references, and provides real-time data quality scoring.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Leads</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Financial</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="leads">
            <UploadLeads user={user} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryUpload user={user} />
          </TabsContent>

          <TabsContent value="financial">
            <FlexibleFinancialUpload user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataUploadCenter;