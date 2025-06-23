
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { leadProcessService } from '@/services/leadProcessService';
import { initializePredefinedProcesses } from '@/services/predefinedProcesses';
import { LeadProcess } from '@/types/leadProcess';
import { Settings, Activity, TrendingUp } from 'lucide-react';

interface ProcessManagementPanelProps {
  selectedLeadIds: string[];
  onProcessAssigned?: () => void;
}

const ProcessManagementPanel = ({ selectedLeadIds, onProcessAssigned }: ProcessManagementPanelProps) => {
  const [processes, setProcesses] = useState<LeadProcess[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      const data = await leadProcessService.getLeadProcesses();
      setProcesses(data);
    } catch (error) {
      console.error('Error loading processes:', error);
    }
  };

  const handleInitializeProcesses = async () => {
    setInitializing(true);
    try {
      await initializePredefinedProcesses();
      await loadProcesses();
    } catch (error) {
      console.error('Error initializing processes:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleAssignProcess = async () => {
    if (!selectedProcessId || selectedLeadIds.length === 0) return;

    setLoading(true);
    try {
      // Assign the selected process to all selected leads
      const assignments = await Promise.all(
        selectedLeadIds.map(leadId => 
          leadProcessService.assignLeadToProcess(leadId, selectedProcessId)
        )
      );

      const successCount = assignments.filter(a => a !== null).length;
      console.log(`Successfully assigned ${successCount} leads to process`);
      
      if (onProcessAssigned) {
        onProcessAssigned();
      }
    } catch (error) {
      console.error('Error assigning process:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAggressionBadgeColor = (level: string) => {
    switch (level) {
      case 'gentle': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-blue-100 text-blue-800';
      case 'aggressive': return 'bg-orange-100 text-orange-800';
      case 'super_aggressive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Process Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {processes.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Processes Available</h3>
            <p className="text-gray-500 mb-4">
              Initialize predefined processes to start using different messaging approaches.
            </p>
            <Button 
              onClick={handleInitializeProcesses}
              disabled={initializing}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {initializing ? 'Initializing...' : 'Initialize Processes'}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Processes</label>
              <div className="grid gap-2">
                {processes.map((process) => (
                  <div 
                    key={process.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProcessId === process.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedProcessId(process.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{process.name}</h4>
                        <p className="text-sm text-gray-600">{process.description}</p>
                      </div>
                      <Badge className={getAggressionBadgeColor(process.aggressionLevel)}>
                        {process.aggressionLevel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedLeadIds.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                </span>
                <Button 
                  onClick={handleAssignProcess}
                  disabled={!selectedProcessId || loading}
                  size="sm"
                >
                  {loading ? 'Assigning...' : 'Assign Process'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcessManagementPanel;
