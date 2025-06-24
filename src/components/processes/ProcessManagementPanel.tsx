
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  BarChart3, 
  Users, 
  Zap, 
  Target,
  TrendingUp,
  Clock,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import EnhancedProcessSelector from './EnhancedProcessSelector';
import { enhancedProcessService, SOURCE_BUCKET_CONFIGS } from '@/services/enhancedProcessService';
import { EnhancedProcessTemplate, ProcessAssignmentLogic } from '@/types/enhancedLeadProcess';

interface ProcessManagementPanelProps {
  leadId?: string;
  leadSource?: string;
  leadType?: string;
  leadStatus?: string;
  onClose?: () => void;
}

const ProcessManagementPanel: React.FC<ProcessManagementPanelProps> = ({
  leadId,
  leadSource,
  leadType,
  leadStatus,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('assign');
  const [availableProcesses, setAvailableProcesses] = useState<EnhancedProcessTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processStats, setProcessStats] = useState<any>(null);

  useEffect(() => {
    initializeProcesses();
  }, []);

  const initializeProcesses = async () => {
    setIsLoading(true);
    try {
      const processes = await enhancedProcessService.initializeEnhancedProcesses();
      setAvailableProcesses(processes);
      
      // Generate mock stats for demonstration
      setProcessStats({
        totalProcesses: processes.length,
        activeLeads: 245,
        avgResponseRate: 0.34,
        topPerformingBucket: 'marketplace'
      });
    } catch (error) {
      console.error('Error initializing processes:', error);
      toast({
        title: "Error",
        description: "Failed to load enhanced processes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessAssigned = (processId: string, logic: ProcessAssignmentLogic) => {
    toast({
      title: "Process Assigned Successfully",
      description: `Lead assigned to ${SOURCE_BUCKET_CONFIGS[logic.sourceBucket].name} process`,
    });
    
    // Refresh stats
    setProcessStats(prev => prev ? {
      ...prev,
      activeLeads: prev.activeLeads + 1
    } : null);
  };

  const getAggressionColor = (level: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800', 
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || colors[3];
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Enhanced Process Management
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assign">Assign Process</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="mt-4">
            {leadId ? (
              <EnhancedProcessSelector
                leadId={leadId}
                leadSource={leadSource}
                leadType={leadType}
                leadStatus={leadStatus}
                onProcessAssigned={handleProcessAssigned}
              />
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a lead to assign an enhanced process</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {processStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Total Processes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{processStats.totalProcesses}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Active Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{processStats.activeLeads}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Response Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.round(processStats.avgResponseRate * 100)}%
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Top Bucket</span>
                    </div>
                    <p className="text-sm font-bold text-purple-600">
                      {SOURCE_BUCKET_CONFIGS[processStats.topPerformingBucket]?.name}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">Source Bucket Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(SOURCE_BUCKET_CONFIGS).map(([key, config]) => (
                  <div key={key} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{config.name}</span>
                      <Badge className={getAggressionColor(config.aggression)}>
                        {config.aggression}/5
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{config.voice}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Performance Analytics</h3>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Performance Tracking</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Performance analytics will be available as leads are processed through the enhanced system.
                  Data includes response rates, conversion metrics, and process effectiveness by source bucket.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Response Rate by Aggression</h4>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div key={level} className="flex items-center justify-between">
                          <span className="text-sm">Level {level}</span>
                          <Badge className={getAggressionColor(level)}>
                            {Math.round(Math.random() * 20 + 15)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Lead Type Performance</h4>
                    <div className="space-y-2">
                      {['Retail', 'Finance', 'Trade-In', 'Commercial'].map(type => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm">{type}</span>
                          <Badge variant="outline">
                            {Math.round(Math.random() * 30 + 20)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Available Process Templates</h3>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading templates...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableProcesses.slice(0, 8).map((process) => (
                    <Card key={process.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{process.name}</h4>
                          <Badge className={getAggressionColor(process.aggression)}>
                            {process.aggression}/5
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {SOURCE_BUCKET_CONFIGS[process.sourceBucket]?.tone}
                        </p>
                        <div className="text-xs text-gray-500">
                          {process.messageSequence.length} messages • {process.statusRules.length} status rules
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              <div className="text-center">
                <Button variant="outline" onClick={initializeProcesses} disabled={isLoading}>
                  <Zap className="h-4 w-4 mr-2" />
                  {isLoading ? 'Generating...' : 'Generate More Templates'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProcessManagementPanel;
