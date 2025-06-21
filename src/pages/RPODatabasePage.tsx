
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RPOManualEntry from '@/components/rpo/RPOManualEntry';
import RPOIntelligenceTable from '@/components/rpo/RPOIntelligenceTable';
import RPOAnalytics from '@/components/rpo/RPOAnalytics';
import { Brain, Database, TrendingUp } from 'lucide-react';

const RPODatabasePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RPO Intelligence Database</h1>
            <p className="text-gray-600">Build and manage your intelligent RPO code mapping system</p>
          </div>
        </div>

        <Tabs defaultValue="manual-entry" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual-entry" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Manual Entry</span>
            </TabsTrigger>
            <TabsTrigger value="intelligence-table" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>RPO Intelligence</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual-entry">
            <RPOManualEntry />
          </TabsContent>

          <TabsContent value="intelligence-table">
            <RPOIntelligenceTable />
          </TabsContent>

          <TabsContent value="analytics">
            <RPOAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RPODatabasePage;
