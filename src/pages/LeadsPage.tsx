
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadsList from '@/components/LeadsList';
import StandaloneEnhancedProcessPanel from '@/components/leads/StandaloneEnhancedProcessPanel';
import { Brain, Settings, TrendingUp } from 'lucide-react';

const LeadsPage = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Lead Management</h1>
        <p className="text-slate-600">Manage your leads and assign intelligent messaging processes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - Leads List */}
        <div className="lg:col-span-3">
          <LeadsList />
        </div>

        {/* Right Sidebar - Process Management */}
        <div className="lg:col-span-1 space-y-6">
          <Tabs defaultValue="enhanced" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="enhanced" className="flex items-center gap-1">
                <Brain className="h-4 w-4" />
                Enhanced
              </TabsTrigger>
              <TabsTrigger value="basic" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Basic
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enhanced" className="mt-6">
              <StandaloneEnhancedProcessPanel />
            </TabsContent>

            <TabsContent value="basic" className="mt-6">
              <div className="text-sm text-gray-600 p-4 border rounded-lg">
                Basic process management is integrated into the leads table. 
                Select leads and use the process panel that appears above the table.
              </div>
            </TabsContent>
          </Tabs>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Process System Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Source Buckets:</span>
                <span className="font-medium">10 types</span>
              </div>
              <div className="flex justify-between">
                <span>Lead Types:</span>
                <span className="font-medium">6 types</span>
              </div>
              <div className="flex justify-between">
                <span>Status Types:</span>
                <span className="font-medium">7 types</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Total Combinations:</span>
                <span className="font-medium text-purple-600">420 processes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsPage;
