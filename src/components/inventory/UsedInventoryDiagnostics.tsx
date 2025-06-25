
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  analyzeUsedInventoryIssues, 
  restoreUsedInventoryFromRecentUploads,
  validateUploadProcessing,
  type UsedInventoryAnalysis 
} from '@/services/inventory/usedInventoryRestoration';

const UsedInventoryDiagnostics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [analysis, setAnalysis] = useState<UsedInventoryAnalysis | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Running used inventory diagnostics...');
      const result = await analyzeUsedInventoryIssues();
      setAnalysis(result);
      
      toast({
        title: "Diagnostics Complete",
        description: `Found ${result.issuesFound.length} issues to address`,
        variant: result.issuesFound.length > 0 ? "destructive" : "default"
      });
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Failed",
        description: "Error running inventory analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreInventory = async () => {
    setRestoring(true);
    try {
      console.log('🔧 Starting inventory restoration...');
      const result = await restoreUsedInventoryFromRecentUploads();
      
      toast({
        title: "Restoration Complete",
        description: result.message,
        variant: result.restored > 0 ? "default" : "destructive"
      });

      // Re-run diagnostics to show updated state
      await runDiagnostics();
    } catch (error) {
      console.error('Restoration failed:', error);
      toast({
        title: "Restoration Failed",
        description: "Error restoring inventory",
        variant: "destructive"
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Used Inventory Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Diagnostics
          </Button>
          
          {analysis && analysis.issuesFound.length > 0 && (
            <Button 
              onClick={restoreInventory} 
              disabled={restoring}
              variant="default"
            >
              {restoring ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
              Restore Used Inventory
            </Button>
          )}
        </div>

        {analysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.totalUsedVehicles}</div>
                <div className="text-sm text-gray-600">Total Used Vehicles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysis.availableUsedVehicles}</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysis.soldUsedVehicles}</div>
                <div className="text-sm text-gray-600">Sold</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Recent Uploads</h4>
              <div className="space-y-2">
                {analysis.recentUploads.map((upload, index) => (
                  <div key={upload.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{upload.filename}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(upload.created_at).toLocaleDateString()} - {upload.vehicle_count} vehicles
                      </div>
                    </div>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index === 0 ? "Latest" : "Previous"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {analysis.issuesFound.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Issues Found
                </h4>
                <div className="space-y-2">
                  {analysis.issuesFound.map((issue, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-red-800">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.issuesFound.length === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800">No issues found with used inventory</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsedInventoryDiagnostics;
